import "dotenv/config"; // primeira linha: carrega o .env antes de tudo
import express, { type NextFunction, type Request, type Response } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { banco } from "./banco";
import type { Genero, NovaTarefa, Prioridade, Status } from "./tipos";

const app = express();
app.use(express.json());

const USUARIO_FIXO = 1; // até existir login, todo mundo é o usuário 1

// Os mesmos valores dos ENUM do banco (tabela titulos).
// Tipadas com os tipos do tipos.ts: se um valor for removido lá, o TypeScript avisa aqui.
const PRIORIDADES: Prioridade[] = ["baixa", "media", "alta"];
const STATUS: Status[] = ["quero ver", "assistindo", "assisti"];
const GENEROS: Genero[] = ["Filme", "Série"];

// O que chega do front no cadastro. Partial porque o JSON pode vir incompleto.
type DadosTitulo = Partial<NovaTarefa>;

// Os "AS" trocam o nome da coluna do jeito do banco para o jeito do TypeScript:
// nome -> titulo, tipo -> genero, criado_em -> criadaEm
const SELECT_TITULOS = `
  SELECT id, nome AS titulo, descricao, tipo AS genero, prioridade, status,
         DATE_FORMAT(assistido_em, '%Y-%m-%d') AS assistidoEm,
         criado_em AS criadaEm
    FROM titulos`;

// Busca um título pelo id. Usada pelo GET e depois de cada INSERT.
async function buscarUm(id: number): Promise<RowDataPacket | undefined> {
  const [linhas] = await banco.execute<RowDataPacket[]>(
    `${SELECT_TITULOS} WHERE id = ? AND usuario_id = ?`,
    [id, USUARIO_FIXO]
  );
  return linhas.length > 0 ? { ...linhas[0], tags: [] } : undefined;
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

// ---------- LER ----------
app.get("/api/usuarios", async (_req, res) => {
  const [linhas] = await banco.execute<RowDataPacket[]>(
    "SELECT id, nome, email FROM usuarios ORDER BY id", // nunca devolva a senha_hash
    []
  );
  res.json(linhas);
});

app.get("/api/titulos", async (_req, res) => {
  const [linhas] = await banco.execute<RowDataPacket[]>(
    `${SELECT_TITULOS} WHERE usuario_id = ? ORDER BY id`,
    [USUARIO_FIXO]
  );
  // os gêneros (Crime, Drama...) chegam depois; por enquanto, lista vazia
  res.json(linhas.map((linha) => ({ ...linha, tags: [] })));
});

app.get("/api/titulos/:id", async (req, res) => {
  const titulo = await buscarUm(Number(req.params.id));
  if (!titulo) {
    res.status(404).json({ erro: `Título #${req.params.id} não encontrado.` });
    return;
  }
  res.json(titulo);
});

// ---------- CRIAR ----------
app.post("/api/titulos", async (req, res) => {
  const dados = req.body as DadosTitulo;
  const problema = validar(dados);
  if (problema) {
    res.status(400).json({ erro: problema }); // 400: o pedido veio errado
    return;
  }
  const [resultado] = await banco.execute<ResultSetHeader>(
    `INSERT INTO titulos (usuario_id, nome, descricao, tipo, prioridade)
     VALUES (?, ?, ?, ?, ?)`,
    [
      USUARIO_FIXO,
      dados.titulo!.trim(),
      dados.descricao ?? null,
      dados.genero!,
      dados.prioridade ?? "media",
    ]
  );
  // 201: criado. Devolve o título como o banco o guardou (com id e data)
  res.status(201).json(await buscarUm(resultado.insertId));
});

// ---------- ATUALIZAR (só o status) ----------
app.patch("/api/titulos/:id/status", async (req, res) => {
  const { status } = req.body as { status?: Status };
  if (!status || !STATUS.includes(status)) {
    res.status(400).json({ erro: "Status inválido." });
    return;
  }
  const [resultado] = await banco.execute<ResultSetHeader>(
    `UPDATE titulos
        SET status = ?, assistido_em = IF(? = 'assisti', CURDATE(), NULL)
      WHERE id = ? AND usuario_id = ?`,
    [status, status, Number(req.params.id), USUARIO_FIXO]
  );
  if (resultado.affectedRows === 0) {
    res.status(404).json({ erro: `Título #${req.params.id} não encontrado.` });
    return;
  }
  res.status(204).end(); // 204: deu certo, e não há nada para devolver
});

// ---------- APAGAR ----------
app.delete("/api/titulos/:id", async (req, res) => {
  const [resultado] = await banco.execute<ResultSetHeader>(
    "DELETE FROM titulos WHERE id = ? AND usuario_id = ?",
    [Number(req.params.id), USUARIO_FIXO]
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