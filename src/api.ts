import type { NovaTarefa, Status, Tarefa } from "./tipos";

// A ajudante que todas as chamadas usam: monta o pedido e trata o erro
async function enviar(metodo: string, url: string, corpo?: unknown): Promise<Response> {
  const resposta = await fetch(url, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  if (!resposta.ok) {
    // a API manda { erro: "..." }; se não mandar, usamos o código
    const dados = (await resposta.json().catch(() => ({}))) as { erro?: string };
    throw new Error(dados.erro ?? `Erro ${resposta.status}`);
  }
  return resposta;
}

// JSON não tem data: criadaEm chega como texto e precisa virar Date
function converter(titulo: Tarefa): Tarefa {
  return { ...titulo, criadaEm: new Date(titulo.criadaEm) };
}

export async function listarTitulos(): Promise<Tarefa[]> {
  const resposta = await enviar("GET", "/api/titulos");
  const bruto = (await resposta.json()) as Tarefa[];
  return bruto.map(converter);
}

export async function cadastrarTitulo(dados: NovaTarefa): Promise<Tarefa> {
  const resposta = await enviar("POST", "/api/titulos", dados);
  return converter((await resposta.json()) as Tarefa);
}

export async function alterarStatus(id: number, status: Status): Promise<void> {
  await enviar("PATCH", `/api/titulos/${id}/status`, { status });
}

export async function removerTitulo(id: number): Promise<void> {
  await enviar("DELETE", `/api/titulos/${id}`);
}