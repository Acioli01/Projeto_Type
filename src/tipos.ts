export type Prioridade = "baixa" | "media" | "alta";
export type Genero = "Filme" | "Série";
export type Status = "quero ver" | "assistindo" | "assisti";
export interface Tarefa {
    readonly id: number;
    titulo: string;
    descricao?: string;
    genero: Genero;
    prioridade: Prioridade;
    status: Status;
    tags: string[];
    criadaEm: Date;
}
export type NovaTarefa =Omit<Tarefa, "id" | "status" | "criadaEm">;