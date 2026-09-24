"""
Script de Povoamento Oficial - LECASU ERP v2.0
Cenário Corporativo Realista de Moçambique (Valores em MZN, NUITs e Empresas Locais)
"""
from datetime import datetime, timedelta
from decimal import Decimal
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.models import (
    User, Client, Proposal, Project, Task, Invoice, 
    Service, Supplier, PurchaseOrder, Employee, EmployeeLeave, Document
)

db = SessionLocal()

try:
    print("=" * 60)
    print("INICIANDO POVOAMENTO DE DADOS CORPORATIVOS - LECASU ERP")
    print("=" * 60)

    # 1. UTILIZADORES & EQUIPA
    print("\n1. Criando Utilizadores e Perfis...")
    users_data = [
        {"name": "Eng. Jossue Mahomed", "email": "admin@lecasu.co.mz", "role": "admin", "phone": "+258 84 123 4567"},
        {"name": "Dra. Samira Ibraimo", "email": "samira.financas@lecasu.co.mz", "role": "financeiro", "phone": "+258 82 987 6543"},
        {"name": "Eng. Américo Sitoe", "email": "americo.engenharia@lecasu.co.mz", "role": "engenheiro", "phone": "+258 87 555 4433"},
        {"name": "Carlos Tembe", "email": "carlos.tecnico@lecasu.co.mz", "role": "tecnico", "phone": "+258 84 888 9911"},
    ]
    users_map = {}
    for u in users_data:
        existing = db.query(User).filter(User.email == u["email"]).first()
        if not existing:
            user = User(
                name=u["name"],
                email=u["email"],
                hashed_password=get_password_hash("AdminLECASU@2026"),
                role=u["role"],
                phone=u["phone"],
                is_active=True
            )
            db.add(user)
            db.flush()
            users_map[u["email"]] = user
        else:
            users_map[u["email"]] = existing
    print(f"-> {len(users_map)} Utilizadores verificados/criados.")

    # 2. CATÁLOGO DE SERVIÇOS
    print("\n2. Povoando Catálogo de Serviços Técnicos...")
    services_data = [
        {"code": "SRV-SOL-01", "name": "Instalação de Sistema Solar Híbrido 10kWp", "category": "Energia Solar", "unit": "Sistema", "price": Decimal("385000.00")},
        {"code": "SRV-AUD-01", "name": "Auditoria de Eficiência Energética e Termografia", "category": "Auditoria", "unit": "Edifício", "price": Decimal("65000.00")},
        {"code": "SRV-ELE-01", "name": "Montagem e Parametrização de Posto de Transformação (PT)", "category": "Instalação Elétrica", "unit": "PT", "price": Decimal("420000.00")},
        {"code": "SRV-MAN-01", "name": "Manutenção Preventiva de Geradores e Nobreaks", "category": "Manutenção", "unit": "Mês", "price": Decimal("45000.00")},
        {"code": "SRV-STU-01", "name": "Estudo de Viabilidade Técnica e Dimensionamento Solar", "category": "Consultoria", "unit": "Projeto", "price": Decimal("85000.00")},
    ]
    for s in services_data:
        if not db.query(Service).filter(Service.code == s["code"]).first():
            db.add(Service(
                code=s["code"],
                name=s["name"],
                category=s["category"],
                unit=s["unit"],
                base_price=s["price"],
                description=f"Serviço técnico especializado LECASU com garantia e suporte operacional.",
                is_active=True
            ))
    print(f"-> {len(services_data)} Serviços de engenharia registados.")

    # 3. CLIENTES CORPORATIVOS DE MOÇAMBIQUE
    print("\n3. Cadastrando Carteira de Clientes...")
    clients_data = [
        {
            "name": "Cervejas de Moçambique (CDM), SA", 
            "nuit": "400123456", 
            "contact_person": "Eng. Rui Langa", 
            "email": "compras.engenharia@cdm.co.mz", 
            "phone": "+258 21 480 000", 
            "address": "Estrada Nacional nº 4, Bairro Matola D, Matola"
        },
        {
            "name": "Portos e Caminhos de Ferro de Moçambique (CFM)", 
            "nuit": "400987123", 
            "contact_person": "Dra. Ana Paula Manhiça", 
            "email": "patrimonio@cfm.co.mz", 
            "phone": "+258 21 352 000", 
            "address": "Praça dos Trabalhadores, Edifício Sede, Baixa, Maputo"
        },
        {
            "name": "Condomínio Residencial Marés da Polana", 
            "nuit": "400888999", 
            "contact_person": "Dr. Fernando Chissano", 
            "email": "administracao@maresdapolana.co.mz", 
            "phone": "+258 84 333 4455", 
            "address": "Av. Julius Nyerere, Polana Cimento, Maputo"
        }
    ]
    clients_map = {}
    for c in clients_data:
        existing_client = db.query(Client).filter(Client.nuit == c["nuit"]).first()
        if not existing_client:
            client = Client(
                name=c["name"],
                nuit=c["nuit"],
                contact_person=c["contact_person"],
                email=c["email"],
                phone=c["phone"],
                address=c["address"]
            )
            db.add(client)
            db.flush()
            clients_map[c["name"]] = client
        else:
            clients_map[c["name"]] = existing_client
    print(f"-> {len(clients_map)} Clientes corporativos cadastrados.")

    # 4. PROPOSTAS COMERCIAIS E PROJETOS
    print("\n4. Criando Propostas e Projetos em Andamento...")
    cdm = clients_map.get("Cervejas de Moçambique (CDM), SA")
    cfm = clients_map.get("Portos e Caminhos de Ferro de Moçambique (CFM)")
    polana = clients_map.get("Condomínio Residencial Marés da Polana")

    # Projeto 1: CDM (75% concluído)
    if cdm and not db.query(Proposal).filter(Proposal.title.like("%Automação e Eficiência Energética%")).first():
        p1 = Proposal(
            client_id=cdm.id,
            title="Automação e Eficiência Energética na Fábrica da Matola",
            scope="Substituição de luminárias industriais por LED inteligente e compensação de fator de potência.",
            total_amount=Decimal("450000.00"),
            status="ACCEPTED"
        )
        db.add(p1)
        db.flush()

        proj1 = Project(
            client_id=cdm.id,
            proposal_id=p1.id,
            code="PRJ-2026-001",
            name="Eficiência Energética Industrial - Fábrica CDM Matola",
            status="IN_PROGRESS"
        )
        db.add(proj1)
        db.flush()

        # Tarefas Projeto 1
        eng = users_map.get("americo.engenharia@lecasu.co.mz")
        tec = users_map.get("carlos.tecnico@lecasu.co.mz")
        tasks1 = [
            Task(project_id=proj1.id, assigned_to=eng.id if eng else None, title="Vistoria técnica e levantamento de cargas", status="DONE", due_date=datetime.utcnow() - timedelta(days=10)),
            Task(project_id=proj1.id, assigned_to=tec.id if tec else None, title="Instalação de bancos de condensadores", status="DONE", due_date=datetime.utcnow() - timedelta(days=3)),
            Task(project_id=proj1.id, assigned_to=tec.id if tec else None, title="Parametrização de sensores e automação de iluminação", status="IN_PROGRESS", due_date=datetime.utcnow() + timedelta(days=5)),
            Task(project_id=proj1.id, assigned_to=eng.id if eng else None, title="Emissão do Relatório Técnico Final de Medição", status="TODO", due_date=datetime.utcnow() + timedelta(days=12))
        ]
        db.add_all(tasks1)

        # Fatura Projeto 1 (PAGA)
        inv1 = Invoice(
            project_id=proj1.id,
            client_id=cdm.id,
            invoice_number="FAT-2026-001",
            amount=Decimal("250000.00"),  # Adiantamento 55%
            status="PAID",
            due_date=datetime.utcnow() - timedelta(days=5),
            created_at=datetime.utcnow() - timedelta(days=15)
        )
        db.add(inv1)

    # Projeto 2: Marés da Polana (33% concluído)
    if polana and not db.query(Proposal).filter(Proposal.title.like("%Sistema Solar Backup%")).first():
        p2 = Proposal(
            client_id=polana.id,
            title="Sistema Solar Fotovoltaico Backup 15kWp",
            scope="Instalação de inversores solares Deye e bancos de baterias Lítio para áreas comuns do condomínio.",
            total_amount=Decimal("520000.00"),
            status="ACCEPTED"
        )
        db.add(p2)
        db.flush()

        proj2 = Project(
            client_id=polana.id,
            proposal_id=p2.id,
            code="PRJ-2026-002",
            name="Instalação Solar Fotovoltaica Condomínio Marés da Polana",
            status="IN_PROGRESS"
        )
        db.add(proj2)
        db.flush()

        tec = users_map.get("carlos.tecnico@lecasu.co.mz")
        tasks2 = [
            Task(project_id=proj2.id, assigned_to=tec.id if tec else None, title="Fixação mecânica das estruturas no terraço", status="DONE", due_date=datetime.utcnow() - timedelta(days=2)),
            Task(project_id=proj2.id, assigned_to=tec.id if tec else None, title="Cabeamento DC e proteção contra surtos (DPS)", status="IN_PROGRESS", due_date=datetime.utcnow() + timedelta(days=4)),
            Task(project_id=proj2.id, assigned_to=users_map.get("americo.engenharia@lecasu.co.mz").id, title="Comissionamento e interligação com a rede EDM", status="TODO", due_date=datetime.utcnow() + timedelta(days=10))
        ]
        db.add_all(tasks2)

        # Fatura Projeto 2 (PENDENTE / A RECEBER)
        inv2 = Invoice(
            project_id=proj2.id,
            client_id=polana.id,
            invoice_number="FAT-2026-002",
            amount=Decimal("260000.00"),
            status="ISSUED",
            due_date=datetime.utcnow() + timedelta(days=15),
            created_at=datetime.utcnow() - timedelta(days=2)
        )
        db.add(inv2)

    # Proposta 3: CFM (Em Negociação - Aberta)
    if cfm and not db.query(Proposal).filter(Proposal.title.like("%Auditoria Energética Edifício Sede%")).first():
        p3 = Proposal(
            client_id=cfm.id,
            title="Auditoria Energética Completa no Edifício Sede CFM",
            scope="Estudo detalhado do consumo dos sistemas de climatização (HVAC) e proposta de redução tarifária.",
            total_amount=Decimal("125000.00"),
            status="SENT"
        )
        db.add(p3)

    print("-> Propostas, Projetos, Tarefas e Faturas em Meticais registados com sucesso.")

    # 5. FORNECEDORES E DESPESAS (MÓDULO 07)
    print("\n5. Povoando Fornecedores e Ordens de Compra...")
    sup_data = [
        {"name": "Solares de Moçambique, Lda", "nuit": "400555666", "category": "Equipamentos Solares", "phone": "+258 21 720 100", "contact": "Eng. David Matusse"},
        {"name": "Distribuidora Elétrica de Maputo (DEM)", "nuit": "400444333", "category": "Material Elétrico", "phone": "+258 84 222 1100", "contact": "Sr. Alberto Sitoe"},
    ]
    sup_map = {}
    for s in sup_data:
        existing_sup = db.query(Supplier).filter(Supplier.nuit == s["nuit"]).first()
        if not existing_sup:
            sup = Supplier(name=s["name"], nuit=s["nuit"], category=s["category"], phone=s["phone"], contact_person=s["contact"])
            db.add(sup)
            db.flush()
            sup_map[s["name"]] = sup
        else:
            sup_map[s["name"]] = existing_sup

    # Ordem de compra liquidada (Despesa realizada)
    solares = sup_map.get("Solares de Moçambique, Lda")
    if solares and not db.query(PurchaseOrder).filter(PurchaseOrder.order_number == "PED-2026-001").first():
        po1 = PurchaseOrder(
            supplier_id=solares.id,
            order_number="PED-2026-001",
            description="Lote de Inversores Híbridos 10kW Deye e Baterias de Lítio 5.12kWh",
            total_amount=Decimal("185000.00"),
            status="PAID",
            due_date=datetime.utcnow() - timedelta(days=4),
            paid_at=datetime.utcnow() - timedelta(days=2)
        )
        db.add(po1)

    dem = sup_map.get("Distribuidora Elétrica de Maputo (DEM)")
    if dem and not db.query(PurchaseOrder).filter(PurchaseOrder.order_number == "PED-2026-002").first():
        po2 = PurchaseOrder(
            supplier_id=dem.id,
            order_number="PED-2026-002",
            description="Condutores elétricos 16mm², disjuntores trifásicos e quadros técnicos estanque",
            total_amount=Decimal("42500.00"),
            status="PENDING",
            due_date=datetime.utcnow() + timedelta(days=10)
        )
        db.add(po2)
    print("-> Fornecedores e Ordens de Compra integrados.")

    # 6. RECURSOS HUMANOS (MÓDULO 08)
    print("\n6. Registando Colaboradores e Férias...")
    employees_data = [
        {"name": "Eng. Américo Sitoe", "email": "americo.sitoe@lecasu.co.mz", "dept": "Engenharia & Operações", "pos": "Engenheiro Eletrotécnico Sénior", "sal": Decimal("85000.00")},
        {"name": "Helena Cossa", "email": "helena.cossa@lecasu.co.mz", "dept": "Comercial & Vendas", "pos": "Gestora de Contas Corporativas", "sal": Decimal("60000.00")},
        {"name": "Carlos Tembe", "email": "carlos.tembe@lecasu.co.mz", "dept": "Engenharia & Operações", "pos": "Técnico Especialista em Instalações", "sal": Decimal("40000.00")},
        {"name": "Nelson Macuácua", "email": "nelson.admin@lecasu.co.mz", "dept": "Financeiro & Administrativo", "pos": "Técnico de Contabilidade e Tesouraria", "sal": Decimal("45000.00")},
    ]
    for emp in employees_data:
        if not db.query(Employee).filter(Employee.email == emp["email"]).first():
            e = Employee(
                name=emp["name"],
                email=emp["email"],
                department=emp["dept"],
                position=emp["pos"],
                base_salary=emp["sal"],
                contract_type="Indeterminado",
                hire_date=datetime.utcnow() - timedelta(days=180),
                is_active=True
            )
            db.add(e)
            db.flush()
            if "Américo" in emp["name"]:
                db.add(EmployeeLeave(
                    employee_id=e.id,
                    leave_type="Férias",
                    start_date=datetime.utcnow() + timedelta(days=20),
                    end_date=datetime.utcnow() + timedelta(days=30),
                    reason="Período de férias regulamentares",
                    status="APPROVED"
                ))
    print("-> 4 Colaboradores e folha salarial de 230.000,00 MZN/mês registados.")

    # 7. DOCUMENTOS NO GED (MÓDULO 09)
    print("\n7. Registando Metadados do Repositório GED...")
    docs_data = [
        {"title": "Caderno de Encargos & Especificações Técnicas - CDM 2026", "cat": "Projetos Técnicos", "fname": "CDM_Especificacao_Tecnica_v1.0.pdf", "size": 2450000},
        {"title": "Contrato de Prestação de Serviços - Marés da Polana", "cat": "Contratos", "fname": "Contrato_Mares_Polana_Assinado.pdf", "size": 1820000},
        {"title": "Certificado de Conformidade e Garantia Inversores Deye 10kW", "cat": "Certificações & Licenças", "fname": "Certificado_Deye_Inversores.pdf", "size": 950000},
    ]
    for d in docs_data:
        if not db.query(Document).filter(Document.title == d["title"]).first():
            db.add(Document(
                title=d["title"],
                category=d["cat"],
                file_name=d["fname"],
                file_path=f"uploads/{d['fname']}",
                file_size_bytes=d["size"],
                mime_type="application/pdf",
                version="v1.0",
                description="Documento corporativo oficial arquivado no repositório GED da LECASU."
            ))
    print("-> Documentos técnicos arquivados no GED.")

    db.commit()
    print("\n" + "=" * 60)
    print("POVOAMENTO CONCLUÍDO COM SUCESSO NO POSTGRESQL!")
    print("O seu ERP agora tem dados vivos de faturamento, projetos e clientes.")
    print("=" * 60)

except Exception as err:
    db.rollback()
    print(f"\n[ERRO DURANTE O POVOAMENTO]: {err}")
finally:
    db.close()