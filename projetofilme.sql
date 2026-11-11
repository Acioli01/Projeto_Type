-- =============================================================
-- Filmes e Séries — banco de dados MySQL 8 ou MariaDB (XAMPP)
-- Projeto do grupo · tema "Filmes e séries" (apostila Aula 1)
-- Baseado no taskflow.sql da Aula 2, trocando pelo tema do grupo:
--   registro principal ........ título (era a tarefa)
--   status (opções fechadas) .. quero ver, assistindo, assisti
--   outro campo fechado ....... tipo: Filme ou Série
--   lista (N:N) ............... gêneros (eram as tags)
-- Rode este script inteiro no MySQL Workbench (raio ⚡), na aba SQL
-- do phpMyAdmin (botão Executar) ou com:
--   mysql -u root -p < filmes_series.sql
-- Ele APAGA e recria o banco: use só em ambiente de aula.
-- =============================================================

SET NAMES utf8mb4;   -- garante os acentos quando o script roda pelo terminal

DROP DATABASE IF EXISTS filmes_series;
CREATE DATABASE filmes_series
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;   -- funciona no MySQL 8 e no MariaDB (XAMPP)

USE filmes_series;

-- -------------------------------------------------------------
-- usuarios: quem usa o sistema (login)
-- -------------------------------------------------------------
CREATE TABLE usuarios (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  nome        VARCHAR(100)  NOT NULL,
  email       VARCHAR(150)  NOT NULL,
  senha_hash  CHAR(60)      NOT NULL,          -- hash bcrypt, NUNCA a senha
  criado_em   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_usuarios        PRIMARY KEY (id),
  CONSTRAINT uq_usuarios_email  UNIQUE (email)
);

-- -------------------------------------------------------------
-- titulos: cada filme ou série da lista do usuário
-- (espelho da interface do registro principal, no tipos.ts)
-- Os ENUM são os mesmos valores dos union types:
--   tipo       -> "Filme" | "Série"
--   prioridade -> "baixa" | "media" | "alta"
--   status     -> "quero ver" | "assistindo" | "assisti"
-- -------------------------------------------------------------
CREATE TABLE titulos (
  id             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  usuario_id     INT UNSIGNED  NOT NULL,
  nome           VARCHAR(120)  NOT NULL,
  descricao      TEXT          NULL,
  tipo           ENUM('Filme', 'Série')                      NOT NULL,
  prioridade     ENUM('baixa', 'media', 'alta')              NOT NULL DEFAULT 'media',
  status         ENUM('quero ver', 'assistindo', 'assisti')  NOT NULL DEFAULT 'quero ver',
  criado_em      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  assistido_em   DATE          NULL,               -- preenchida quando status = 'assisti'
  CONSTRAINT pk_titulos PRIMARY KEY (id),
  CONSTRAINT fk_titulos_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON DELETE CASCADE,
  -- mesma regra do cadastro no TypeScript: nome com pelo menos 3 caracteres
  CONSTRAINT ck_titulos_nome CHECK (CHAR_LENGTH(TRIM(nome)) >= 3)
);

-- a consulta mais comum: "os títulos DESTE usuário com ESTE status"
CREATE INDEX ix_titulos_usuario_status ON titulos (usuario_id, status);

-- -------------------------------------------------------------
-- generos: cada usuário tem a sua lista de gêneros
-- -------------------------------------------------------------
CREATE TABLE generos (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id  INT UNSIGNED NOT NULL,
  nome        VARCHAR(40)  NOT NULL,
  CONSTRAINT pk_generos PRIMARY KEY (id),
  CONSTRAINT uq_generos_usuario_nome UNIQUE (usuario_id, nome),
  CONSTRAINT fk_generos_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON DELETE CASCADE
);

-- -------------------------------------------------------------
-- titulo_genero: relacionamento N:N entre títulos e gêneros
-- (no TypeScript era só uma lista de textos: string[])
-- -------------------------------------------------------------
CREATE TABLE titulo_genero (
  titulo_id  INT UNSIGNED NOT NULL,
  genero_id  INT UNSIGNED NOT NULL,
  CONSTRAINT pk_titulo_genero PRIMARY KEY (titulo_id, genero_id),
  CONSTRAINT fk_titulo_genero_titulo FOREIGN KEY (titulo_id)
    REFERENCES titulos (id) ON DELETE CASCADE,
  CONSTRAINT fk_titulo_genero_genero FOREIGN KEY (genero_id)
    REFERENCES generos (id) ON DELETE CASCADE
);

-- =============================================================
-- DADOS DE EXEMPLO — os seis títulos do dados.ts
-- Senha dos dois usuários: senha123
-- =============================================================
INSERT INTO usuarios (nome, email, senha_hash) VALUES
  ('Ana Souza',    'ana@filmesseries.dev',   '$2b$10$X46TZdkKX8P2NZNov1SoaOmtQ5JmGB.x/nK1IWAMCrYuZ1/TBFGcS'),
  ('Bruno Lima',   'bruno@filmesseries.dev', '$2b$10$X46TZdkKX8P2NZNov1SoaOmtQ5JmGB.x/nK1IWAMCrYuZ1/TBFGcS');

INSERT INTO titulos (usuario_id, nome, descricao, tipo, prioridade, status, assistido_em) VALUES
  (1, 'Star Wars 3: A Vingança dos Sith', NULL, 'Filme', 'alta',  'quero ver', NULL),
  (1, 'Dexter',                           NULL, 'Série', 'baixa', 'assisti',   CURDATE()),
  (1, 'Breaking Bad',                     NULL, 'Série', 'alta',  'quero ver', NULL),
  (1, 'Smallville',                       NULL, 'Série', 'media', 'quero ver', NULL),
  (1, 'Vingadores: Doomsday',             NULL, 'Filme', 'alta',  'quero ver', NULL),
  (1, 'Harry Potter',                     NULL, 'Filme', 'baixa', 'assisti',   CURDATE()),
  (2, 'Interestelar', 'Ver com o grupo do curso', 'Filme', 'alta', 'quero ver', NULL);

INSERT INTO generos (usuario_id, nome) VALUES
  (1, 'Ação'), (1, 'Aventura'), (1, 'Ficção científica'), (1, 'Crime'),
  (1, 'Drama'), (1, 'Fantasia'), (1, 'Suspense'),
  (2, 'Ficção científica'), (2, 'Drama');

INSERT INTO titulo_genero (titulo_id, genero_id) VALUES
  (1, 3), (1, 2),            -- Star Wars 3: Ficção científica, Aventura
  (2, 4), (2, 5), (2, 7),    -- Dexter: Crime, Drama, Suspense
  (3, 4), (3, 5),            -- Breaking Bad: Crime, Drama
  (4, 3), (4, 5),            -- Smallville: Ficção científica, Drama
  (5, 1), (5, 3),            -- Vingadores: Doomsday: Ação, Ficção científica
  (6, 6), (6, 2),            -- Harry Potter: Fantasia, Aventura
  (7, 8), (7, 9);            -- Interestelar: Ficção científica, Drama

-- =============================================================
-- CONSULTAS DE CONFERÊNCIA (rode uma de cada vez)
-- =============================================================

-- 1) Os títulos da Ana, com os gêneros juntos numa coluna
-- SELECT t.id, t.nome, t.tipo, t.prioridade, t.status,
--        GROUP_CONCAT(g.nome ORDER BY g.nome SEPARATOR ', ') AS generos
--   FROM titulos t
--   LEFT JOIN titulo_genero tg ON tg.titulo_id = t.id
--   LEFT JOIN generos g        ON g.id = tg.genero_id
--  WHERE t.usuario_id = 1
--  GROUP BY t.id
--  ORDER BY FIELD(t.prioridade, 'alta', 'media', 'baixa'), t.nome;

-- 2) O painel: quantos títulos em cada status
--    ("quero ver" é o card "Pendentes" da tela)
-- SELECT status, COUNT(*) AS quantidade
--   FROM titulos
--  WHERE usuario_id = 1
--  GROUP BY status;

-- 3) Quantos filmes e quantas séries
-- SELECT tipo, COUNT(*) AS quantidade
--   FROM titulos
--  WHERE usuario_id = 1
--  GROUP BY tipo;

-- 4) O aviso "Comece por": o primeiro título de prioridade alta
-- SELECT id, nome
--   FROM titulos
--  WHERE usuario_id = 1 AND prioridade = 'alta'
--  ORDER BY id
--  LIMIT 1;

-- 5) Esperado: a Ana tem 6 títulos
--    status: 4 "quero ver", 0 "assistindo", 2 "assisti"
--    tipo:   3 Filmes e 3 Séries
--    "Comece por": #1 Star Wars 3: A Vingança dos Sith