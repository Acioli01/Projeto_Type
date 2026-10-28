import type { Tarefa } from "./tipos";
export const tarefas: Tarefa[] = [
    {
        id: 1, titulo: "Estudar interfaces", prioridade: "alta", status: "quero ver",
        tags: ["estudo", "ts"], criadaEm: new Date()
    },
    {
        id: 2, titulo: "Comprar café", prioridade: "baixa", status: "quero ver",
        tags: ["casa"], criadaEm: new Date()
    },
    {
        id: 3, titulo: "Revisar pull request", descricao: "PR #42", prioridade: "alta",
        status: "assisti", tags: ["trabalho"], criadaEm: new Date()
    },
    {
        id: 4, titulo: "Praticar laços", prioridade: "media", status: "assistindo",
        tags: ["estudo", "ts"], criadaEm: new Date()
    },
    {
        id: 5, titulo: "Agendar dentista", prioridade: "media", status: "assistindo",
        tags: ["saude"], criadaEm: new Date()
    },
    {
        id: 6, titulo: "Organizar a mesa", prioridade: "baixa", status: "assisti",
        tags: ["casa"], criadaEm: new Date()
    },
];