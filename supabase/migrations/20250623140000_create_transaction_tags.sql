CREATE TABLE public.transaction_tags (
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (transaction_id, tag_id)
);

CREATE INDEX idx_transaction_tags_transaction_id ON public.transaction_tags (transaction_id);
CREATE INDEX idx_transaction_tags_tag_id ON public.transaction_tags (tag_id);
