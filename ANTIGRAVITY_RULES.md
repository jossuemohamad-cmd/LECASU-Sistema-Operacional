# REGRAS DE DESENVOLVIMENTO - LECASU ERP v2.0

## 1. Contexto do Projeto
- Sistema: LECASU Sistema Operacional (ERP).
- Prazo de entrega do MVP: 3 Semanas.
- Objetivo central: Ciclo Comercial -> Operacional -> Financeiro.

## 2. As 10 Abas Oficiais (PROIBIDO criar abas de 1º nível além destas):
1. Dashboard (Visão geral, KPIs reais, tarefas pendentes)
2. Clientes & Propostas (Leads, clientes, propostas comerciais)
3. Serviços (Catálogo de serviços e preços base)
4. Projetos (Execução, prazos, status, fases)
5. Equipa Técnica (Alocação, agenda técnica, tarefas)
6. Gestão Financeira (Receitas, despesas, faturas, pagamentos)
7. Fornecedores (Cadastro de compras e suprimentos)
8. Recursos Humanos (Colaboradores e registros internos)
9. Repositório GED (Anexos, metadados e documentos)
10. Definições (Configurações, utilizadores, perfis e permissões)

## 3. Design System & Tokens Visuais
- Cores: Fundo limpo (Branco/Cinza claro #f8f9fa), Grafite escuro (#1e293b / #0f172a) para texto/sidebar, e Laranja (#ea580c / #f97316) como cor de destaque (accent).
- Tipografia: Body 14px; Labels 12-13px; H2 18-20px; H1 22-24px.
- Espaçamentos (Scale): 4, 8, 12, 16, 20, 24, 32, 40, 48px.
- Sidebar: 220-240px fixa (72-80px colapsada); Header: 56-64px.
- Estilo: Interface limpa, profissional e técnica. Sem gradientes chamativos, sem sombras pesadas.

## 4. Padrão Arquitetural de Código
- Backend: FastAPI + Pydantic v2 + SQLAlchemy 2.0 + PostgreSQL.
- Frontend: React + TypeScript + Vite + Tailwind CSS + Lucide Icons.
- Regra de ouro: Nada de dados falsos (mocks). Se não houver dados, exibir Empty State com botão de ação.
- Validação obrigatória no Backend antes de gravar no banco.
