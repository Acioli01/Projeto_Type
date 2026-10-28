export type Prioridade = "baixa" | "media" | "alta";
export type Status = "quero ver" | "assistindo" | "assisti";
export interface Tarefa {
    readonly id: number;
    titulo: string;
    descricao?: string;
    prioridade: Prioridade;
    status: Status;
    tags: string[];
    criadaEm: Date;
}
export type NovaTarefa =Omit<Tarefa, "id" | "status" | "criadaEm">;