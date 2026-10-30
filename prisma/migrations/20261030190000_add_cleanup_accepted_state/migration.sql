ALTER TABLE "approval_cleanup_obligations" DROP CONSTRAINT "approval_cleanup_obligations_state_check";
ALTER TABLE "approval_cleanup_obligations" ADD CONSTRAINT "approval_cleanup_obligations_state_check" CHECK (state IN ('awaiting_operation','ready','claimed','accepted','submitted','unknown','failed','cleared'));
