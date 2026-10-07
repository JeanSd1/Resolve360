# Jean Durgante — Tech Solutions

React / Express / tRPC / Drizzle starter, adapted from the Sandbox web-db-user template.

- `pnpm dev`: development server; honors `PORT` (default 3000).
- `pnpm build` / `pnpm start`: build and serve `dist/index.js` and `dist/public/`.
- `pnpm db:migrate`: apply checked-in migrations. `pnpm db:push`: generate and apply new schema changes.
- `pnpm check` / `pnpm test`: types and application tests.

Start with the Webdev skill's default-template guide. Platform login, storage, payments and service contracts live in its shared references; read the relevant capability before extending its helper.

`server/_core/publicConfig.ts` exposes only named public runtime values. Private keys stay server-side. The platform serves managed `/manus-storage/` assets; the application does not register a second proxy.

Platform configuration is readable and editable through `webdev.config`. Default settings are initial values, not enforced constraints. The agent may modify the files, commands and configuration or follow the flexible guide for another stack.


## Supabase e painel administrativo

Este projeto usa o Supabase para autenticação por e-mail/senha, serviços, horários, orçamentos e reservas. No ambiente WebDev, as variáveis já são injetadas de forma protegida e não existe necessidade de criar um `.env`:

- `SUPABASE_URL`: URL pública do projeto Supabase.
- `SUPABASE_ANON_KEY`: chave pública anon usada pelo cliente.
- `SUPABASE_SERVICE_ROLE_KEY`: chave privada usada apenas pelo servidor.
- `SUPABASE_ADMIN_EMAIL`: e-mail autorizado a abrir o painel `/admin`.

Para uma execução local fora do WebDev, copie `.env.example` para `.env`, preencha os valores no ambiente local e nunca faça commit do ficheiro `.env`. Execute também o conteúdo de `supabase/schema.sql` no SQL Editor do Supabase. O painel `/admin` oferece criação de conta, login, edição/pausa de serviços, alteração de preços, gestão de horários e atualização do estado das reservas. As alterações públicas e administrativas usam Supabase Realtime quando o projeto está publicado.
