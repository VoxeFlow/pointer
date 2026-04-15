PROJECT STRUCTURE POINTER

Admin:
- src/app/(app)/admin/accounting/page.tsx
- src/app/t/[slug]/(protected)/admin/accounting/page.tsx

Payslip:
- src/components/admin/payslip-batch-generator-form.tsx
- src/components/admin/payslip-edit-form.tsx
- src/components/admin/payslip-upload-form.tsx

APIs:
- src/app/api/admin/payroll-preview/route.ts
- src/app/api/admin/payroll-profiles/route.ts
- src/app/api/admin/payslips/route.ts
- src/app/api/admin/payslips/[id]/route.ts
- src/app/api/admin/payslips/batch/route.ts

Core:
- src/lib/payroll.ts
- src/lib/payroll-attendance.ts


PROJECT RULES POINTER

- menor alteração possível
- não criar fluxo novo
- não duplicar lógica
- reutilizar componentes existentes
- manter uma única fonte de verdade de estado
- não alterar rotas
- não alterar navegação


RELATIONSHIPS

- payslip-edit-form.tsx é responsável pela edição do contracheque
- payroll-preview/route.ts fornece dados iniciais
- payroll-profiles/route.ts fornece fallback de dados
- payslips/route.ts salva o contracheque
- payslips/batch/route.ts gera contracheques em lote

- accounting/page.tsx apenas compõe UI


STATE RULE

- preview, edição e publicação usam o MESMO estado
- proibido criar estado paralelo
