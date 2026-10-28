import type { Tarefa } from "./tipos";
export const tarefas: Tarefa[] = [
    {
        id: 1, titulo: "Star Wars 3 A Vingaça dos Sith", prioridade: "alta", status: "quero ver", genero: "Filme",
        tags: ["estudo", "ts"], criadaEm: new Date()
    },
    {
        id: 2, titulo: "Dexter", prioridade: "baixa", status: "assisti", genero: "Série",
        tags: ["casa"], criadaEm: new Date()
    },
    {
        id: 3, titulo: "Breaking Bead", descricao: "PR #42", prioridade: "alta", genero: "Série",
        status: "quero ver", tags: ["trabalho"], criadaEm: new Date()
    },
    {
        id: 4, titulo: "SmallVille", prioridade: "media", status: "quero ver", genero: "Série",
        tags: ["estudo", "ts"], criadaEm: new Date()
    },
    {
        id: 5, titulo: "Vingadores Doomsday", prioridade: "alta", status: "quero ver", genero: "Filme",
        tags: ["saude"], criadaEm: new Date()
    },
    {
        id: 6, titulo: "Harry Potter", prioridade: "baixa", status: "assisti",genero: "Filme",
        tags: ["casa"], criadaEm: new Date()
    },
];