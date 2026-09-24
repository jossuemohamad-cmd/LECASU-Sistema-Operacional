# LECASU ERP v2.0 - Sistema Operacional Empresarial

Sistema Integrado de Gestão Empresarial (ERP) desenvolvido especificamente para a **LECASU**, integrando todo o ciclo operacional, comercial, técnico e financeiro.

---

## 🏛️ As 10 Abas Oficiais do Sistema

1. **Dashboard** - Visão geral dos principais indicadores de desempenho (KPIs), progresso de projetos, faturamento e tarefas pendentes.
2. **Clientes & Propostas** - Gestão completa de clientes e criação de propostas comerciais com conversão direta em projetos.
3. **Serviços** - Catálogo de serviços com categorização, preços base e unidades de medida.
4. **Projetos** - Acompanhamento da execução de projetos, status operacional, prazos e percentagem de conclusão.
5. **Equipa Técnica** - Gestão de técnicos, alocação de intervenções e monitorização da produtividade mensal.
6. **Gestão Financeira** - Emissão e liquidação de faturas comerciais (`FT-2026-XXXX`), contas a receber, despesas e fluxo de caixa.
7. **Fornecedores** - Cadastro de fornecedores e emissão de ordens de compra (`OC-2026-XXXX`).
8. **Recursos Humanos (RH)** - Registo de colaboradores, processamento de folha salarial e aprovação de férias/licenças.
9. **Repositório GED** - Gestão Eletrónica de Documentos técnicos, contratos e relatórios com upload e download seguro.
10. **Definições** - Gestão de utilizadores, controlo de acessos por perfil e redefinição administrativa de senhas.

---

## 💻 Stack Tecnológica

* **Backend:** FastAPI, SQLAlchemy 2.0, Pydantic v2, PostgreSQL (Neon Serverless), PyJWT, Passlib (Bcrypt).
* **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons.
* **Performance:** Consultas agregadas otimizadas (`GROUP BY`), eliminação de N+1 queries, índices em chaves estrangeiras e cache SWR em memória no frontend.

---

## 🚀 Como Executar Localmente

### 1. Backend (FastAPI)
```bash
cd backend
python -m venv venv
# Ativar venv no Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Instalar dependências:
pip install -r requirements.txt
# Iniciar servidor FastAPI:
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
Aceda à aplicação em: `http://localhost:5173`

---

## 🔑 Acesso Padrão (Administrador)
* **E-mail:** `admin@lecasu.co.mz`
* **Senha:** `AdminLECASU@2026`

---

© 2026 LECASU Sistema Operacional. Todos os direitos reservados.
