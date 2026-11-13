import { campo, elemento, selecao } from "./dom";
import { alterarStatus, cadastrarTitulo, listarTitulos, removerTitulo } from "./api";
import type { Genero, Prioridade, Status, Tarefa } from "./tipos";

elemento("nome-do-sistema").textContent = "Filmes e Séries";
elemento("versao").textContent = "v0.4.0";
elemento("data-de-hoje").textContent = new Date().toLocaleDateString("pt-BR");

let lista: Tarefa[] = [];

function mostrarErro(erro: unknown): void {
  elemento("erro").textContent = erro instanceof Error ? erro.message : "Erro inesperado.";
}

// Uma ajudante para criar botões sem repetir código
function botao(texto: string, extra: string, aoClicar: () => void): HTMLButtonElement {
  const elementoBotao = document.createElement("button");
    elementoBotao.type = "button";
    elementoBotao.className = `botao botao--pequeno ${extra}`;
    elementoBotao.textContent = texto;
    elementoBotao.addEventListener("click", aoClicar); // callback, de novo
    return elementoBotao;
  }

function criarItem(titulo: Tarefa): HTMLLIElement {
  const item = document.createElement("li");
  item.className = `tarefa tarefa--${titulo.prioridade}`;
  if (titulo.status === "assisti") {
    item.classList.add("tarefa--concluida"); // já assistido: fica apagado
  }

  const principal = document.createElement("div");

  const nome = document.createElement("h3");
  nome.className = "tarefa__titulo";
  nome.textContent = `#${titulo.id} ${titulo.titulo} (${titulo.genero})`;

  const meta = document.createElement("div");
  meta.className = "tarefa__meta";

  const etiqueta = document.createElement("span");
  etiqueta.className = `etiqueta etiqueta--${titulo.prioridade}`;
  etiqueta.textContent = titulo.prioridade;

  const situacao = document.createElement("span");
  situacao.className = "etiqueta etiqueta--status";
  situacao.textContent = titulo.status; // quero ver, assistindo ou assisti

  meta.append(etiqueta, situacao);
  principal.append(nome, meta);

  // Os botões: cada um fecha sobre o SEU título
  const acoes = document.createElement("div");
  acoes.className = "tarefa__acoes";
  if (titulo.status !== "assisti") {
    if (titulo.status !== "assistindo") {
      acoes.append(botao("Assistindo", "", () => mudarStatus(titulo.id, "assistindo")));
    }
    acoes.append(botao("Assisti", "botao--sucesso", () => mudarStatus(titulo.id, "assisti")));
  } else {
    acoes.append(botao("Quero rever", "", () => mudarStatus(titulo.id, "quero ver")));
  }
  acoes.append(botao("Remover", "botao--perigo", () => remover(titulo.id)));

  item.append(principal, acoes);
  return item;
}

function desenhar(): void {
  elemento("lista").replaceChildren(...lista.map(criarItem));
  // "quero ver" é o card "Pendentes" da tela
  const pendentes = lista.filter((t) => t.status === "quero ver");
  elemento("total").textContent = String(lista.length);
  elemento("pendentes").textContent = String(pendentes.length);
}

// O par que você vai repetir a noite toda:
// 1. o banco confirma  2. o estado muda sem ser alterado  3. a tela acompanha
async function mudarStatus(id: number, status: Status): Promise<void> {
  try {
    await alterarStatus(id, status);
    lista = lista.map((t) => (t.id === id ? { ...t, status } : t));
    desenhar();
  } catch (erro) {
    mostrarErro(erro);
  }
}

async function remover(id: number): Promise<void> {
  try {
    await removerTitulo(id);
    lista = lista.filter((t) => t.id !== id);
    desenhar();
  } catch (erro) {
    mostrarErro(erro);
  }
}

elemento("formulario").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  elemento("erro").textContent = "";
  try {
    const novo = await cadastrarTitulo({
      titulo: campo("titulo").value.trim(),
      prioridade: selecao("prioridade").value as Prioridade,
      genero: selecao("genero").value as Genero, // Filme ou Série
      tags: [],
    });
    lista = [...lista, novo]; // acrescentar sem alterar: uma lista nova
    campo("titulo").value = "";
    desenhar();
  } catch (erro) {
    mostrarErro(erro);
  }
});

async function iniciar(): Promise<void> {
  try {
    lista = await listarTitulos();
    desenhar();
  } catch (erro) {
    mostrarErro(erro);
  }
}

iniciar();