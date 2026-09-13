-- Columns ModerationManager needs (SPEC.md §7, issue #11).

-- The current reason for the current `rejected` status, denormalized for cheap display
-- to the author. `mod_actions.reason` stays the append-only audit trail; this is a
-- "current state" cache the same shape `status` itself already is. Cleared whenever a
-- later action moves the item off `rejected`.
alter table public.posts add column rejection_reason text;
alter table public.comments add column rejection_reason text;

-- Set by ApproveAsMature (#11). Artistic nudity may be approved only with this tag
-- (SPEC.md §7); mature items render blurred with click-to-reveal regardless of
-- publication state.
alter table public.media_assets add column mature boolean not null default false;
