import "dotenv/config"; // primeira linha: carrega o .env antes de tudo
import express from "express";
import type { Request, Response } from "express";
import type { RowDataPacket } from "mysql2";
import { banco } from "./banco";

const app = express();
app.use(express.json());

// O SELECT que as rotas de títulos usam. Os "AS" trocam o nome da coluna
// do jeito do banco para o jeito do TypeScript (tipos.ts):
//   nome -> titulo, tipo -> genero, criado_em -> criadaEm
const SELECT_TITULOS = `
  SELECT id, nome AS titulo, descricao, tipo AS genero, prioridade, status,
         DATE_FORMAT(assistido_em, '%Y-%m-%d') AS assistidoEm,
         criado_em AS criadaEm
    FROM titulos`;

// Evita que um erro do banco derrube o servidor: responde 500 e mostra no terminal
function seguro(
  rota: (req: Request, res: Response) => Promise<void>
): (req: Request, res: Response) => Promise<void> {
  return async (req, res) => {
    try {
      await rota(req, res);
    } catch (erro) {
      console.error(erro);
      res.status(500).json({ erro: "Falha ao consultar o banco de dados." });
    }
  };
}

// Todos os usuários (nunca devolva a senha_hash)
app.get("/api/usuarios", seguro(async (_req, res) => {
  const [linhas] = await banco.execute<RowDataPacket[]>(
    "SELECT id, nome, email FROM usuarios ORDER BY id",
    []
  );
  res.json(linhas);
}));

// Todos os títulos (filmes e séries) de todos os usuários
app.get("/api/titulos", seguro(async (_req, res) => {
  const [linhas] = await banco.execute<RowDataPacket[]>(
    `${SELECT_TITULOS} ORDER BY id`,
    [] // sem filtro: nenhum ? nesta consulta
  );
  // os gêneros chegam depois; por enquanto, uma lista vazia em cada título
  res.json(linhas.map((linha) => ({ ...linha, tags: [] })));
}));

// Um título: pode não existir!
app.get("/api/titulos/:id", seguro(async (req, res) => {
  const [linhas] = await banco.execute<RowDataPacket[]>(
    `${SELECT_TITULOS} WHERE id = ?`,
    [Number(req.params.id)]
  );
  if (linhas.length === 0) {
    res.status(404).json({ erro: `Título #${req.params.id} não encontrado.` });
    return;
  }
  res.json({ ...linhas[0], tags: [] });
}));

app.listen(3000, () => console.log("API do Projeto_Type em http://localhost:3000"));