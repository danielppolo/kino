create table
  public.roles (
    id serial,
    name text not null,
    constraint roles_pkey primary key (id),
    constraint roles_name_key unique (name)
  ) tablespace pg_default;


INSERT INTO roles (name) VALUES ('viewer'), ('editor');