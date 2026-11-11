import type { Tarefa } from "./tipos";

// Todos os títulos (filmes e séries) que estão no banco
export async function listarTitulos(): Promise<Tarefa[]> {
  const resposta = await fetch("/api/titulos");
  if (!resposta.ok) {
    throw new Error("Não foi possível carregar os títulos. A API está rodando?");
  }
  const bruto = (await resposta.json()) as Tarefa[];
  // JSON não tem data: criadaEm chega como texto e precisa virar Date
  return bruto.map((t) => ({ ...t, criadaEm: new Date(t.criadaEm) }));
}

// Um título: devolve undefined se ele não existir (o mesmo padrão do find)
export async function buscarTitulo(id: number): Promise<Tarefa | undefined> {
  const resposta = await fetch(`/api/titulos/${id}`);
  if (resposta.status === 404) {
    return undefined;
  }
  if (!resposta.ok) {
    throw new Error(`Erro ${resposta.status} ao buscar o título #${id}.`);
  }
  const bruto = (await resposta.json()) as Tarefa;
  return { ...bruto, criadaEm: new Date(bruto.criadaEm) };
}