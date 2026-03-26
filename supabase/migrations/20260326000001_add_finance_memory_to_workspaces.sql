ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS finance_memory JSONB;

COMMENT ON COLUMN public.workspaces.finance_memory IS
'Workspace-scoped finance copilot memory with user-declared profile data and system-derived context.';
