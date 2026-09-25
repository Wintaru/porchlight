-- A moderator's "nothing wrong here" on a reported item (#40). SPEC.md §7: every
-- moderator action writes mod_actions, so closing reports as dismissed needs its own
-- action kind.
alter type public.mod_action_kind add value 'dismiss_reports';
