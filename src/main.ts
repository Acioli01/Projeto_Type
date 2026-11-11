import { campo, elemento, selecao } from "./dom";
import { buscarTitulo, listarTitulos } from "./api";
import type { Genero, Prioridade, Tarefa } from "./tipos";
import { adicionarTarefa } from "./servicos";

elemento("nome-do-sistema").textContent = "Filmes e Séries";
elemento("versao").textContent = "v0.3.0";
elemento("data-de-hoje").textContent = new Date().toLocaleDateString("pt-BR");

// Começa vazia: quem preenche é a API (e por isso é let, não const)
let lista: Tarefa[] = [];

function criarItem(tarefa: Tarefa): HTMLLIElement {
  const item = document.createElement("li");
  item.className = `tarefa tarefa--${tarefa.prioridade}`;

  const titulo = document.createElement("h3");
  titulo.className = "tarefa__titulo";
  titulo.textContent = `#${tarefa.id} ${tarefa.titulo} (${tarefa.genero})`;

  const meta = document.createElement("div");
  meta.className = "tarefa__meta";

  const etiqueta = document.createElement("span");
  etiqueta.className = `etiqueta etiqueta--${tarefa.prioridade}`;
  etiqueta.textContent = tarefa.prioridade;

  const situacao = document.createElement("span");
  situacao.className = "etiqueta etiqueta--status";
  situacao.textContent = tarefa.status; // quero ver, assistindo ou assisti

  // map de novo: cada gênero (por enquanto, as tags) vira um <span>
  const tags = tarefa.tags.map((tag) => {
    const elementoTag = document.createElement("span");
    elementoTag.className = "tag";
    elementoTag.textContent = tag;
    return elementoTag;
  });

  meta.append(etiqueta, situacao, ...tags);
  item.append(titulo, meta);
  return item;
}

function desenhar(): void {
  // map: o seu transformar da Aula 2, que já vem pronto
  elemento("lista").replaceChildren(...lista.map(criarItem));
  // filter: só os que ainda estão na fila ("quero ver" é o "Pendentes" da tela)
  const pendentes = lista.filter((t) => t.status === "quero ver");
  elemento("total").textContent = String(lista.length);
  elemento("pendentes").textContent = String(pendentes.length);
}

// O cadastro ainda grava só na tela. Na Aula 4 ele vai para o banco.
elemento("formulario").addEventListener("submit", (evento) => {
  evento.preventDefault();
  elemento("erro").textContent = "";
  try {
    adicionarTarefa(lista, {
      titulo: campo("titulo").value.trim(),
      prioridade: selecao("prioridade").value as Prioridade,
      genero: selecao("genero").value as Genero, // Filme ou Série
      tags: [],
    });
    campo("titulo").value = "";
    desenhar();
  } catch (erro) {
    if (erro instanceof Error) {
      elemento("erro").textContent = erro.message;
    }
  }
});

// O começo do programa: busca no banco, depois desenha
async function iniciar(): Promise<void> {
  try {
    lista = await listarTitulos();
    desenhar();

    // find no banco: pode não encontrar
    const procurado = await buscarTitulo(3);
    if (procurado) {
      console.log(`Encontrado: ${procurado.titulo}`);
    } else {
      console.log("Título #3 não existe.");
    }
  } catch (erro) {
    if (erro instanceof Error) {
      elemento("erro").textContent = erro.message;
    }
  }
}

iniciar();