CREATE TABLE "listing_checkpoint_top_of_books" (
    "provider" VARCHAR(30) NOT NULL,
    "symbol" VARCHAR(30) NOT NULL,
    "label" VARCHAR(10) NOT NULL,
    "update_id" TEXT NOT NULL,
    "bid_price" TEXT NOT NULL,
    "bid_quantity" TEXT NOT NULL,
    "ask_price" TEXT NOT NULL,
    "ask_quantity" TEXT NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_checkpoint_top_of_books_pkey" PRIMARY KEY ("provider", "symbol", "label"),
    CONSTRAINT "listing_checkpoint_top_of_books_update_id_check" CHECK ("update_id" ~ '^(0|[1-9][0-9]*)$'),
    CONSTRAINT "listing_checkpoint_top_of_books_bid_price_check" CHECK ("bid_price" ~ '^([1-9][0-9]*(\.[0-9]+)?|0\.[0-9]*[1-9][0-9]*)$'),
    CONSTRAINT "listing_checkpoint_top_of_books_bid_quantity_check" CHECK ("bid_quantity" ~ '^(0|[1-9][0-9]*)(\.[0-9]+)?$'),
    CONSTRAINT "listing_checkpoint_top_of_books_ask_price_check" CHECK ("ask_price" ~ '^([1-9][0-9]*(\.[0-9]+)?|0\.[0-9]*[1-9][0-9]*)$'),
    CONSTRAINT "listing_checkpoint_top_of_books_ask_quantity_check" CHECK ("ask_quantity" ~ '^(0|[1-9][0-9]*)(\.[0-9]+)?$'),
    CONSTRAINT "listing_checkpoint_top_of_books_book_check" CHECK ("ask_price"::NUMERIC >= "bid_price"::NUMERIC),
    CONSTRAINT "listing_checkpoint_top_of_books_checkpoint_fkey" FOREIGN KEY ("provider", "symbol", "label") REFERENCES "listing_observation_checkpoints"("provider", "symbol", "label") ON DELETE CASCADE ON UPDATE CASCADE
);
