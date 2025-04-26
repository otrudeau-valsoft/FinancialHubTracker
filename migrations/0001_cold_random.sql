CREATE TABLE "current_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"region" text NOT NULL,
	"regular_market_price" numeric,
	"regular_market_change" numeric,
	"regular_market_change_percent" numeric,
	"regular_market_volume" numeric,
	"regular_market_day_high" numeric,
	"regular_market_day_low" numeric,
	"market_cap" numeric,
	"trailing_pe" numeric,
	"forward_pe" numeric,
	"dividend_yield" numeric,
	"fifty_two_week_high" numeric,
	"fifty_two_week_low" numeric,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "data_update_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"details" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "earnings" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"region" text NOT NULL,
	"company" text NOT NULL,
	"fiscal_quarter" text NOT NULL,
	"fiscal_year" integer NOT NULL,
	"report_date" date NOT NULL,
	"time_of_day" text,
	"eps_estimate" numeric,
	"eps_actual" numeric,
	"eps_surprise" numeric,
	"eps_surprise_percent" numeric,
	"revenue_estimate" numeric,
	"revenue_actual" numeric,
	"revenue_surprise" numeric,
	"revenue_surprise_percent" numeric,
	"stock_impact" numeric,
	"guidance" text,
	"notes" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "earnings_calendar" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"region" text NOT NULL,
	"company" text NOT NULL,
	"earnings_date" date NOT NULL,
	"confirmed" boolean DEFAULT false,
	"time_of_day" text,
	"estimated_eps" numeric,
	"last_quarter_eps" numeric,
	"market_cap" numeric,
	"importance" text DEFAULT 'normal' NOT NULL,
	"stock_rating" text,
	"stock_type" text,
	"notes" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "market_indices" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"name" text NOT NULL,
	"region" text NOT NULL,
	"current_price" numeric,
	"daily_change" numeric,
	"daily_change_percent" numeric,
	"ytd_change_percent" numeric,
	"fifty_two_week_high" numeric,
	"fifty_two_week_low" numeric,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "portfolio_CAD" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"company" text NOT NULL,
	"stock_type" text NOT NULL,
	"rating" text NOT NULL,
	"sector" text,
	"quantity" numeric NOT NULL,
	"price" numeric NOT NULL,
	"pbr" numeric,
	"net_asset_value" numeric,
	"portfolio_percentage" numeric,
	"benchmark_percentage" numeric,
	"delta" numeric,
	"daily_change_percent" numeric,
	"mtd_change_percent" numeric,
	"ytd_change_percent" numeric,
	"six_month_change_percent" numeric,
	"fifty_two_week_change_percent" numeric,
	"dividend_yield" numeric,
	"profit_loss" numeric,
	"next_earnings_date" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "portfolio_INTL" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"company" text NOT NULL,
	"stock_type" text NOT NULL,
	"rating" text NOT NULL,
	"sector" text,
	"quantity" numeric NOT NULL,
	"price" numeric NOT NULL,
	"pbr" numeric,
	"net_asset_value" numeric,
	"portfolio_percentage" numeric,
	"benchmark_percentage" numeric,
	"delta" numeric,
	"daily_change_percent" numeric,
	"mtd_change_percent" numeric,
	"ytd_change_percent" numeric,
	"six_month_change_percent" numeric,
	"fifty_two_week_change_percent" numeric,
	"dividend_yield" numeric,
	"profit_loss" numeric,
	"next_earnings_date" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "portfolio_USD" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"company" text NOT NULL,
	"stock_type" text NOT NULL,
	"rating" text NOT NULL,
	"sector" text,
	"quantity" numeric NOT NULL,
	"price" numeric NOT NULL,
	"pbr" numeric,
	"net_asset_value" numeric,
	"portfolio_percentage" numeric,
	"benchmark_percentage" numeric,
	"delta" numeric,
	"daily_change_percent" numeric,
	"mtd_change_percent" numeric,
	"ytd_change_percent" numeric,
	"six_month_change_percent" numeric,
	"fifty_two_week_change_percent" numeric,
	"dividend_yield" numeric,
	"profit_loss" numeric,
	"next_earnings_date" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "upgrade_downgrade_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"region" text NOT NULL,
	"firm" text NOT NULL,
	"to_grade" text NOT NULL,
	"from_grade" text,
	"action" text NOT NULL,
	"epoch_grade_date" varchar,
	"grade_date" date,
	"created_at" timestamp DEFAULT now()
);
