// Le schéma, en un seul endroit : la migration de production et le Postgres en
// mémoire des tests appliquent EXACTEMENT les mêmes instructions. Deux schémas
// qui divergent, c'est un bug qui n'apparaît qu'en prod.

export const SCHEMA = [
  `create table if not exists joueurs (
     id serial primary key,
     pseudo text not null unique,
     code_hache text not null,
     cree_le timestamptz not null default now(),
     echecs int not null default 0,
     bloque_jusqu_a timestamptz
   )`,
  `create table if not exists resultats (
     joueur_id int not null references joueurs(id) on delete cascade,
     niveau int not null check (niveau > 0 and niveau <= 2000),
     coups int not null check (coups > 0 and coups <= 600),
     parfait boolean not null default false,
     maj_le timestamptz not null default now(),
     primary key (joueur_id, niveau)
   )`,
  `create index if not exists resultats_niveau on resultats (niveau)`,
]
