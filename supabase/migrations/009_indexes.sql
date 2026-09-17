-- ==============================================================================
-- MIGRATION 009: HIGH-PERFORMANCE INDEXES CHO NỀN TẢNG TRỌ XINH
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_buildings_district ON public.buildings(district);
CREATE INDEX IF NOT EXISTS idx_buildings_owner_id ON public.buildings(owner_id);
CREATE INDEX IF NOT EXISTS idx_rooms_building_id ON public.rooms(building_id);
CREATE INDEX IF NOT EXISTS idx_rooms_owner_id ON public.rooms(owner_id);
CREATE INDEX IF NOT EXISTS idx_rooms_price ON public.rooms(price);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_moderation_status ON public.rooms(moderation_status);
CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON public.rooms(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id, created_at DESC);
