CREATE TABLE "alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"message" text NOT NULL,
	"details" text,
	"severity" text NOT NULL,
	"rule_type" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "assets_cad" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"company" text NOT NULL,
	"quantity" numeric,
	"pbr" numeric,
	"stock_rating" text,
	"stock_type" text,
	"sector" text,
	"next_earnings_date" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "assets_intl" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"company" text NOT NULL,
	"quantity" numeric,
	"pbr" numeric,
	"stock_rating" text,
	"stock_type" text,
	"sector" text,
	"next_earnings_date" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "assets_us" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"company" text NOT NULL,
	"quantity" numeric,
	"pbr" numeric,
	"stock_rating" text,
	"stock_type" text,
	"sector" text,
	"next_earnings_date" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "etf_holdings_acwx" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" text NOT NULL,
	"name" text NOT NULL,
	"sector" text,
	"asset_class" text,
	"market_value" numeric,
	"weight" numeric,
	"price" numeric,
	"quantity" numeric,
	"location" text,
	"exchange" text,
	"currency" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "etf_holdings_spy" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" text NOT NULL,
	"name" text NOT NULL,
	"sector" text,
	"asset_class" text,
	"market_value" numeric,
	"weight" numeric,
	"price" numeric,
	"quantity" numeric,
	"location" text,
	"exchange" text,
	"currency" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "etf_holdings_xic" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" text NOT NULL,
	"name" text NOT NULL,
	"sector" text,
	"asset_class" text,
	"market_value" numeric,
	"weight" numeric,
	"price" numeric,
	"quantity" numeric,
	"location" text,
	"exchange" text,
	"currency" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "historical_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"date" date NOT NULL,
	"open" numeric,
	"high" numeric,
	"low" numeric,
	"close" numeric NOT NULL,
	"volume" numeric,
	"adjusted_close" numeric,
	"region" text NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "matrix_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_type" text NOT NULL,
	"action_type" text NOT NULL,
	"stock_type_value" json NOT NULL,
	"order_number" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_summaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"region" text NOT NULL,
	"total_value" numeric NOT NULL,
	"daily_change" numeric,
	"daily_change_percent" numeric,
	"benchmark_value" numeric,
	"benchmark_diff" numeric,
	"benchmark_diff_percent" numeric,
	"cash_position" numeric,
	"cash_position_percent" numeric,
	"stock_count" integer,
	"ytd_performance" numeric,
	"ytd_performance_value" numeric,
	"active_alerts" integer,
	"critical_alerts" integer,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
