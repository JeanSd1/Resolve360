# Jean Durgante — Tech Solutions

## Objetivo

Construir uma página digital pública, responsiva e mobile-first para acesso por QR code no cartão de visitas de Jean Durgante. O produto deverá combinar apresentação profissional, contacto imediato, gerador de orçamento e agendamento de visitas, com uma área administrativa protegida para gerir os dados. O projeto será independente e não importará nem sincronizará projetos do GitHub.

## Abordagem de implementação

- **Frontend:** React + TypeScript + Tailwind, reaproveitando o starter `web-db-user` e os componentes Radix já instalados.
- **Backend:** Express + tRPC, com procedimentos públicos para catálogo, orçamento e disponibilidade; procedimentos `adminProcedure` para gestão administrativa.
- **Persistência:** Supabase como fonte principal de dados, usando `@supabase/supabase-js` no servidor com service role protegida. O schema está em `supabase/schema.sql`, com RLS de leitura pública, índice único de data/horário e publicação Realtime.
- **Autenticação:** Supabase Auth com e-mail e senha. O servidor valida o Bearer token com a service role e só permite administração ao e-mail presente em `SUPABASE_ADMIN_EMAIL`; a service role nunca chega ao navegador.
- **Experiência pública:** página única com âncoras `#servicos`, `#orcamento`, `#agenda` e `#contato`. As ações de orçamento e reserva também ficam disponíveis por cartões e navegação móvel.
- **Área administrativa:** rota `/admin`, protegida no cliente pelo utilizador autenticado e no servidor pelos procedimentos de administrador. Inclui configuração de serviços, preço indicativo, horários e estado das reservas.
- **WhatsApp:** links com mensagem pré-preenchida; como o número real ainda não foi fornecido, usar um número configurável e placeholder claramente editável em `shared/const.ts`.
- **Resiliência:** a página pública continua útil sem dados de base de dados durante desenvolvimento, usando catálogo inicial local; quando a API estiver disponível, os dados persistidos substituem o fallback. Reservas são revalidadas no servidor numa operação transacional/condicional para impedir duplicidade.

## Arquitetura de pastas

- `client/src/App.tsx`: rotas públicas e administrativas.
- `client/src/pages/Home.tsx`: landing page, orçamento, agenda e contacto.
- `client/src/pages/Admin.tsx`: painel autenticado.
- `client/src/components/ServiceCard.tsx`: cartão visual de serviço e interação de seleção.
- `client/src/components/QuoteBuilder.tsx`: seleção, cálculo, resumo e link de WhatsApp.
- `client/src/components/BookingWidget.tsx`: seleção de data, horário e confirmação.
- `client/src/components/AdminPanel.tsx`: visão operacional de gestão.
- `client/src/index.css`: sistema visual, tokens, efeitos e responsividade.
- `server/routers.ts`: API tRPC pública e protegida.
- `server/db.ts`: queries e mutações Drizzle.
- `server/supabase.ts`: adaptador Supabase para dados e validação de sessão.
- `drizzle/schema.ts`: tabelas e tipos persistentes.
- `drizzle/0001_tech_solutions.sql`: migração das tabelas da aplicação.
- `supabase/schema.sql`: schema executado no projeto Supabase.
- `client/src/lib/supabase.ts` e `client/src/_core/hooks/useSupabaseAuth.ts`: cliente público, login e sessão.
- `public/manus-routes.json`: manifesto completo de rotas públicas e administrativas.

## Design

### Movimento

**Digital craft / neo-SaaS editorial:** uma base clara e elegante de estúdio técnico, com superfícies em azul-noite, branco quente e azul elétrico. A linguagem é mais próxima de uma ferramenta premium de produto do que de um portfólio genérico ou de um terminal hacker.

### Princípios

1. **Confiança operacional:** hierarquia forte, textos curtos, números/labels técnicos e ações claras.
2. **Tecnologia humana:** efeitos de brilho e linhas de circuito com moderação, equilibrados por espaços amplos e linguagem acessível.
3. **Conversão sem pressão:** WhatsApp, orçamento e agenda sempre a uma ação de distância, sem popups intrusivos.
4. **Ritmo editorial:** alternar blocos de conteúdo e painéis de ação em vez de uma grelha centralizada repetitiva.

### Filosofia de cor

- **Azul-noite** para comunicar domínio técnico e segurança.
- **Branco névoa** para leitura e sensação de produto bem acabado.
- **Azul elétrico `#4F8CFF`** como cor proprietária e sinal de ação.
- **Lima suave `#B7F36B`** apenas em micro-indicadores de disponibilidade, trazendo energia sem cair no verde fluorescente do layout anterior.

### Paradigma de layout

Um **canvas editorial assimétrico**: hero em duas colunas com painel de orçamento à direita; serviços em faixa horizontal com cartões de altura variada; agenda e prova de método divididas em blocos; CTA final em banda escura. No mobile, tudo colapsa numa coluna com navegação por âncoras e barra fixa de WhatsApp.

### Elementos assinatura

- Marca `JD/` em monograma com barra de progresso.
- Linhas finas de circuito e pontos luminosos no hero, como textura de infraestrutura.
- Chips de estado (`ONLINE`, `ORÇAMENTO`, `AGENDA`) e marcador de disponibilidade.

### Interação e animação

Interações devem parecer precisas: cartões elevam 2–4px e iluminam a borda ao passar o cursor; contadores e total do orçamento fazem transição curta; secções entram com `fade-up` discreto; respeitar `prefers-reduced-motion`. Não usar animação contínua pesada nem cursor customizado.

### Tipografia

- **Display:** `Space Grotesk`, peso 600–700, para headlines e números.
- **Interface/corpo:** `DM Sans`, peso 400–600, para leitura e formulários.
- Labels técnicos em `DM Mono`, uppercase, tracking amplo.

### Essência da marca

> Tecnologia aplicada para resolver o que trava a sua operação — com clareza, rapidez e presença local.

Personalidade: **precisa, acessível, versátil**.

### Voz da marca

Direta, segura e humana. Evitar promessas vagas e linguagem de agência.

- Headline: **“Problema técnico? Eu transformo em próximo passo.”**
- CTA: **“Monte seu orçamento em 60 segundos”**.

### Wordmark e cor proprietária

O wordmark é `JD/` em caixa monoespacial, acompanhado de `JEAN DURGANTE` em sans condensada; a barra `/` vira uma assinatura gráfica nos botões. A cor proprietária é o azul elétrico `#4F8CFF`.

## Dependências e restrições

- Não adicionar dependência desnecessária; `lucide-react`, `date-fns`, Radix, tRPC e `@supabase/supabase-js` estão disponíveis.
- As variáveis `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_ADMIN_EMAIL` são segredos/configuração do projeto WebDev; não usar `.env` versionado nem expor valores no chat.
- O ambiente de produção precisa ter o schema de `supabase/schema.sql` executado no SQL Editor antes de aceitar reservas e alterações administrativas.
- Não criar integração com GitHub.
- Não inventar o telefone definitivo: manter contacto configurável e sinalizar no painel/constante.
- Não armazenar dados sensíveis de clientes além do necessário para contato e reserva.
- Não executar operações destrutivas no banco; a migração é apenas aditiva.
