import { campo, elemento, selecao } from "./dom";
import {
  alterarStatus,
  cadastrarTitulo,
  criarConta,
  encerrarSessao,
  entrar,
  guardarSessao,
  listarTitulos,
  removerTitulo,
  sessaoAtual,
} from "./api";
import type { Genero, Prioridade, Status, Tarefa } from "./tipos";

elemento("nome-do-sistema").textContent = "Filmes e Séries";
elemento("versao").textContent = "v0.5.0";
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

   // map de novo: cada gênero vira um <span>
  const generos = titulo.tags.map((tag) => {
    const elementoTag = document.createElement("span");
    elementoTag.className = "tag";
    elementoTag.textContent = tag;
    return elementoTag;
  });

  meta.append(etiqueta, situacao, ...generos);
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

// ---------- A tela de entrada (Aula 5) ----------
function mostrarErroEntrada(erro: unknown): void {
  const mensagem = erro instanceof Error ? erro.message : "Erro inesperado.";
  elemento("erro-entrada").textContent = mensagem;
}

// Troca entre "Entrar" e "Criar conta"
function mostrarFormulario(criando: boolean): void {
  elemento("form-criar").hidden = !criando;
  elemento("form-entrar").hidden = criando;
  elemento("alternar-entrada").textContent = criando
    ? "Já tenho conta"
    : "Ainda não tenho conta";
  elemento("erro-entrada").textContent = "";
}

elemento("alternar-entrada").addEventListener("click", () => {
  mostrarFormulario(elemento("form-criar").hidden === true); // escondido? então mostra
});

elemento("form-entrar").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  try {
    guardarSessao(await entrar(campo("entrar-email").value, campo("entrar-senha").value));
    campo("entrar-senha").value = "";
    await iniciar();
  } catch (erro) {
    mostrarErroEntrada(erro);
  }
});

elemento("form-criar").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const email = campo("criar-email").value;
  const senha = campo("criar-senha").value;
  try {
    await criarConta(campo("criar-nome").value, email, senha);
    guardarSessao(await entrar(email, senha)); // criou? já entra direto
    (elemento("form-criar") as HTMLFormElement).reset(); // não deixa a senha no campo
    await iniciar();
  } catch (erro) {
    mostrarErroEntrada(erro);
  }
});

elemento("botao-sair").addEventListener("click", () => {
  encerrarSessao();
  lista = [];
  (elemento("form-entrar") as HTMLFormElement).reset();
  mostrarFormulario(false); // volta sempre para "Entrar"
  iniciar();
});

// ---------- O começo: com sessão, mostra o sistema; sem, a entrada ----------
async function iniciar(): Promise<void> {
  const sessao = sessaoAtual();
  elemento("tela-entrada").hidden = sessao !== undefined;
  elemento("tela-app").hidden = sessao === undefined;
  elemento("botao-sair").hidden = sessao === undefined;
  elemento("usuario-nome").textContent = sessao?.nome ?? "";
  if (!sessao) {
    return;
  }
  elemento("erro-entrada").textContent = "";
  try {
    lista = await listarTitulos();
    desenhar();
  } catch (erro) {
    mostrarErro(erro);
  }
}

iniciar();