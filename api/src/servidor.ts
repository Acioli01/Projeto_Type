import "dotenv/config"; // primeira linha: carrega o .env antes de tudo
import bcrypt from "bcryptjs";
import express, { type NextFunction, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { exigirLogin, SEGREDO, usuarioDe } from "./autenticacao";
import { banco } from "./banco";
import type { Genero, NovaTarefa, Prioridade, Status } from "./tipos";

const app = express();
app.use(express.json());

// Os mesmos valores dos ENUM do banco (tabela titulos)
const PRIORIDADES: Prioridade[] = ["baixa", "media", "alta"];
const STATUS: Status[] = ["quero ver", "assistindo", "assisti"];
const GENEROS: Genero[] = ["Filme", "Série"];

// O que chega do front no cadastro. Partial porque o JSON pode vir incompleto.
type DadosTitulo = Partial<NovaTarefa>;

// Os "AS" trocam o nome da coluna do jeito do banco para o jeito do TypeScript:
// nome -> titulo, tipo -> genero, criado_em -> criadaEm
// Agora com os gêneros: uma subconsulta junta os nomes numa linha só
const SELECT_TITULOS = `
  SELECT t.id, t.nome AS titulo, t.descricao, t.tipo AS genero, t.prioridade, t.status,
         DATE_FORMAT(t.assistido_em, '%Y-%m-%d') AS assistidoEm,
         t.criado_em AS criadaEm,
         (SELECT GROUP_CONCAT(g.nome ORDER BY g.nome SEPARATOR ',')
            FROM titulo_genero tg
            JOIN generos g ON g.id = tg.genero_id
           WHERE tg.titulo_id = t.id) AS tags
    FROM titulos t`;

// O banco devolve os gêneros como "Crime,Drama" (ou null): viram um array
function paraTitulo(linha: RowDataPacket): RowDataPacket {
  return { ...linha, tags: linha.tags ? String(linha.tags).split(",") : [] };
}

// Busca um título pelo id, só se ele for do usuário logado.
async function buscarUm(id: number, usuarioId: number): Promise<RowDataPacket | undefined> {
  const [linhas] = await banco.execute<RowDataPacket[]>(
    `${SELECT_TITULOS} WHERE t.id = ? AND t.usuario_id = ?`,
    [id, usuarioId]
  );
  return linhas.length > 0 ? paraTitulo(linhas[0]) : undefined;
}

// Devolve a mensagem de erro, ou undefined se estiver tudo certo
function validar(dados: DadosTitulo): string | undefined {
  if (typeof dados.titulo !== "string" || dados.titulo.trim().length < 3) {
    return "O título precisa ter pelo menos 3 caracteres.";
  }
  if (dados.genero === undefined || !GENEROS.includes(dados.genero)) {
    return "Gênero inválido: use Filme ou Série.";
  }
  if (dados.prioridade !== undefined && !PRIORIDADES.includes(dados.prioridade)) {
    return "Prioridade inválida.";
  }
  return undefined;
}

// ---------- USUÁRIOS (Aula 5) ----------
app.post("/api/usuarios", async (req, res) => {
  const { nome, email, senha } = req.body as { nome?: string; email?: string; senha?: string };
  if (!nome?.trim() || !email?.includes("@") || !senha || senha.length < 6) {
    res.status(400).json({
      erro: "Preencha nome, e-mail válido e senha de 6 caracteres ou mais.",
    });
    return;
  }
  const hash = await bcrypt.hash(senha, 10); // a senha nunca vai para o banco
  try {
    const [resultado] = await banco.execute<ResultSetHeader>(
      "INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)",
      [nome.trim(), email.trim().toLowerCase(), hash]
    );
    res.status(201).json({ id: resultado.insertId });
  } catch (erro) {
    // quem descobre o e-mail repetido é o UNIQUE do banco
    if ((erro as { code?: string }).code === "ER_DUP_ENTRY") {
      res.status(409).json({ erro: "Este e-mail já está cadastrado." });
      return;
    }
    throw erro;
  }
});

app.post("/api/login", async (req, res) => {
  const { email, senha } = req.body as { email?: string; senha?: string };
  const [linhas] = await banco.execute<RowDataPacket[]>(
    "SELECT id, nome, senha_hash FROM usuarios WHERE email = ?",
    [email?.trim().toLowerCase() ?? ""]
  );
  const usuario = linhas[0];
  if (!usuario || !senha || !(await bcrypt.compare(senha, usuario.senha_hash))) {
    // a mesma mensagem nos dois casos: não contamos qual dos dois errou
    res.status(401).json({ erro: "E-mail ou senha inválidos." });
    return;
  }
  const token = jwt.sign({ id: usuario.id }, SEGREDO, { expiresIn: "8h" });
  res.json({ token, nome: usuario.nome });
});

// ---------- DAQUI PARA BAIXO, SÓ COM LOGIN ----------

// ---------- LER ----------
app.get("/api/titulos", exigirLogin, async (_req, res) => {
  const [linhas] = await banco.execute<RowDataPacket[]>(
    `${SELECT_TITULOS} WHERE t.usuario_id = ? ORDER BY t.id`,
    [usuarioDe(res)]
  );
  res.json(linhas.map(paraTitulo));
});

app.get("/api/titulos/:id", exigirLogin, async (req, res) => {
  const titulo = await buscarUm(Number(req.params.id), usuarioDe(res));
  if (!titulo) {
    res.status(404).json({ erro: `Título #${req.params.id} não encontrado.` });
    return;
  }
  res.json(titulo);
});

// ---------- CRIAR ----------
app.post("/api/titulos", exigirLogin, async (req, res) => {
  const dados = req.body as DadosTitulo;
  const problema = validar(dados);
  if (problema) {
    res.status(400).json({ erro: problema }); // 400: o pedido veio errado
    return;
  }
  const dono = usuarioDe(res);
  const [resultado] = await banco.execute<ResultSetHeader>(
    `INSERT INTO titulos (usuario_id, nome, descricao, tipo, prioridade)
     VALUES (?, ?, ?, ?, ?)`,
    [
      dono,
      dados.titulo!.trim(),
      dados.descricao ?? null,
      dados.genero!,
      dados.prioridade ?? "media",
    ]
  );
  // 201: criado. Devolve o título como o banco o guardou (com id e data)
  res.status(201).json(await buscarUm(resultado.insertId, dono));
});

// ---------- ATUALIZAR (só o status) ----------
app.patch("/api/titulos/:id/status", exigirLogin, async (req, res) => {
  const { status } = req.body as { status?: Status };
  if (!status || !STATUS.includes(status)) {
    res.status(400).json({ erro: "Status inválido." });
    return;
  }
  const [resultado] = await banco.execute<ResultSetHeader>(
    `UPDATE titulos
        SET status = ?, assistido_em = IF(? = 'assisti', CURDATE(), NULL)
      WHERE id = ? AND usuario_id = ?`,
    [status, status, Number(req.params.id), usuarioDe(res)]
  );
  if (resultado.affectedRows === 0) {
    res.status(404).json({ erro: `Título #${req.params.id} não encontrado.` });
    return;
  }
  res.status(204).end(); // 204: deu certo, e não há nada para devolver
});

// ---------- APAGAR ----------
app.delete("/api/titulos/:id", exigirLogin, async (req, res) => {
  const [resultado] = await banco.execute<ResultSetHeader>(
    "DELETE FROM titulos WHERE id = ? AND usuario_id = ?",
    [Number(req.params.id), usuarioDe(res)]
  );
  if (resultado.affectedRows === 0) {
    res.status(404).json({ erro: `Título #${req.params.id} não encontrado.` });
    return;
  }
  res.status(204).end();
});

// ---------- ERROS NÃO PREVISTOS: sempre depois de todas as rotas ----------
app.use((erro: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(erro); // o detalhe técnico fica só no terminal
  res.status(500).json({ erro: "Algo deu errado no servidor. Tente de novo." });
});

app.listen(3000, () => console.log("API do Projeto_Type em http://localhost:3000"));