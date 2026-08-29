CREATE EXTENSION IF NOT EXISTS "pg_trgm";
--> statement-breakpoint
CREATE TABLE "ai_models" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text,
	"short_name" text,
	"author" text,
	"description" text,
	"model_version_group_id" text,
	"context_length" integer,
	"input_modalities" text[],
	"output_modalities" text[],
	"has_text_output" text,
	"group" text,
	"instruct_type" text,
	"permaslug" text,
	"endpoint_id" text,
	"throughput" double precision,
	"max_completion_tokens" integer,
	"supported_parameters" text[],
	"modality_score" integer,
	"pricing" jsonb,
	"features" jsonb,
	"prompt_price" double precision,
	"completion_price" double precision,
	"provider" text NOT NULL,
	"scraped_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gpu_price_samples" (
	"stable_key" text NOT NULL,
	"provider" text NOT NULL,
	"observed_at" timestamp NOT NULL,
	"price_usd" double precision NOT NULL,
	"scraped_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gpu_price_samples_stable_key_observed_at_pk" PRIMARY KEY("stable_key","observed_at")
);
--> statement-breakpoint
CREATE TABLE "gpu_pricing" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"observed_at" timestamp NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"source_hash" text,
	"data" jsonb NOT NULL,
	"stable_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_latency_samples" (
	"permaslug" text NOT NULL,
	"endpoint_id" text NOT NULL,
	"observed_at" timestamp NOT NULL,
	"latency" double precision NOT NULL,
	"scraped_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "model_latency_samples_permaslug_endpoint_id_observed_at_pk" PRIMARY KEY("permaslug","endpoint_id","observed_at")
);
--> statement-breakpoint
CREATE TABLE "model_throughput_samples" (
	"permaslug" text NOT NULL,
	"endpoint_id" text NOT NULL,
	"observed_at" timestamp NOT NULL,
	"throughput" double precision NOT NULL,
	"scraped_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "model_throughput_samples_permaslug_endpoint_id_observed_at_pk" PRIMARY KEY("permaslug","endpoint_id","observed_at")
);
--> statement-breakpoint
CREATE TABLE "tools" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text,
	"developer" text,
	"description" text,
	"category" text,
	"price" text,
	"license" text,
	"url" text,
	"stack" text,
	"oss" text,
	"stable_key" text
);
--> statement-breakpoint
CREATE TABLE "user_favorites" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"gpu_uuid" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_model_favorites" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"model_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_tool_favorites" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tool_stable_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"newsletter_subscribed" boolean DEFAULT true NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_model_favorites" ADD CONSTRAINT "user_model_favorites_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tool_favorites" ADD CONSTRAINT "user_tool_favorites_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_models_slug_idx" ON "ai_models" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "ai_models_author_idx" ON "ai_models" USING btree ("author");--> statement-breakpoint
CREATE INDEX "ai_models_context_length_idx" ON "ai_models" USING btree ("context_length");--> statement-breakpoint
CREATE INDEX "ai_models_throughput_idx" ON "ai_models" USING btree ("throughput");--> statement-breakpoint
CREATE INDEX "ai_models_max_completion_tokens_idx" ON "ai_models" USING btree ("max_completion_tokens");--> statement-breakpoint
CREATE INDEX "ai_models_input_modalities_idx" ON "ai_models" USING gin ("input_modalities");--> statement-breakpoint
CREATE INDEX "ai_models_output_modalities_idx" ON "ai_models" USING gin ("output_modalities");--> statement-breakpoint
CREATE INDEX "ai_models_name_desc_idx" ON "ai_models" USING gin (to_tsvector('english', coalesce("name", '') || ' ' || coalesce("description", '')));--> statement-breakpoint
CREATE INDEX "ai_models_provider_priority_idx" ON "ai_models" USING btree ((array_position(
      ARRAY[
        'Azure','Google Vertex','Groq','Together','Fireworks','OpenAI','Anthropic','Google AI Studio',
        'Amazon Bedrock','Mistral','Cohere','xAI','Perplexity','DeepSeek','Cerebras',
        'SambaNova','DeepInfra','Cloudflare','NVIDIA','Alibaba','MoonshotAI','BaseTen','Nebius',
        'Crusoe','Friendli','Hyperbolic','MiniMax','AI21','SiliconFlow','Novita','Inflection',
        'Venice','Chutes','Z.AI','Weights and Biases','Phala','AtlasCloud','Parasail',
        'NCompass','Inception','Relace','Morph','Infermatic','AionLabs','Mancer','NextBit',
        'Liquid','OpenInference','GMICloud','Switchpoint','Featherless','Avian','Stealth'
      ],
      "provider"
    )),lower("provider"));--> statement-breakpoint
CREATE INDEX "ai_models_provider_name_idx" ON "ai_models" USING btree ("provider","short_name");--> statement-breakpoint
CREATE INDEX "ai_models_pricing_idx" ON "ai_models" USING gin ("pricing");--> statement-breakpoint
CREATE INDEX "ai_models_prompt_price_idx" ON "ai_models" USING btree ("prompt_price");--> statement-breakpoint
CREATE INDEX "ai_models_completion_price_idx" ON "ai_models" USING btree ("completion_price");--> statement-breakpoint
CREATE INDEX "ai_models_normalized_name_idx" ON "ai_models" USING btree ((COALESCE(lower(trim("short_name")), lower(trim("name")), '')));--> statement-breakpoint
CREATE INDEX "ai_models_modality_score_idx" ON "ai_models" USING btree ("modality_score");--> statement-breakpoint
CREATE INDEX "gpu_price_samples_provider_idx" ON "gpu_price_samples" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "gpu_price_samples_observed_idx" ON "gpu_price_samples" USING btree ("observed_at");--> statement-breakpoint
CREATE INDEX "gpu_pricing_provider_idx" ON "gpu_pricing" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "gpu_pricing_provider_priority_idx" ON "gpu_pricing" USING btree ((array_position(
      ARRAY['coreweave','lambda','runpod','digitalocean','oracle','nebius','hyperstack','crusoe','flyio','vultr','latitude','ori','voltagepark','googlecloud','verda','scaleway','replicate','thundercompute','koyeb','sesterce','aws','azure','civo','vast','hotaisle','alibaba','oblivus','paperspace','togetherai'],
      lower("provider")
    )),lower("provider"));--> statement-breakpoint
CREATE INDEX "gpu_pricing_observed_at_idx" ON "gpu_pricing" USING btree ("observed_at");--> statement-breakpoint
CREATE INDEX "gpu_pricing_data_idx" ON "gpu_pricing" USING gin ("data");--> statement-breakpoint
CREATE INDEX "gpu_pricing_vram_idx" ON "gpu_pricing" USING btree ((CAST("data"->>'vram_gb' AS NUMERIC)));--> statement-breakpoint
CREATE INDEX "gpu_pricing_price_idx" ON "gpu_pricing" USING btree ((COALESCE(
      CAST("data"->>'price_hour_usd' AS NUMERIC),
      CAST("data"->>'price_usd' AS NUMERIC)
    )));--> statement-breakpoint
CREATE INDEX "gpu_pricing_model_trgm_idx" ON "gpu_pricing" USING gin ((COALESCE("data"->>'gpu_model', "data"->>'item', "data"->>'sku', '')) gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "gpu_pricing_type_trgm_idx" ON "gpu_pricing" USING gin ((COALESCE("data"->>'type', '')) gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "gpu_pricing_gpu_count_idx" ON "gpu_pricing" USING btree ((CAST("data"->>'gpu_count' AS NUMERIC)));--> statement-breakpoint
CREATE INDEX "gpu_pricing_vcpus_idx" ON "gpu_pricing" USING btree ((CAST("data"->>'vcpus' AS NUMERIC)));--> statement-breakpoint
CREATE INDEX "gpu_pricing_system_ram_idx" ON "gpu_pricing" USING btree ((CAST("data"->>'system_ram_gb' AS NUMERIC)));--> statement-breakpoint
CREATE INDEX "gpu_pricing_type_sort_idx" ON "gpu_pricing" USING btree ((COALESCE("data"->>'type', '')));--> statement-breakpoint
CREATE INDEX "gpu_pricing_stable_key_idx" ON "gpu_pricing" USING btree ("stable_key");--> statement-breakpoint
CREATE INDEX "model_latency_endpoint_idx" ON "model_latency_samples" USING btree ("endpoint_id");--> statement-breakpoint
CREATE INDEX "model_throughput_endpoint_idx" ON "model_throughput_samples" USING btree ("endpoint_id");--> statement-breakpoint
CREATE INDEX "tools_name_idx" ON "tools" USING btree ("name");--> statement-breakpoint
CREATE INDEX "tools_price_idx" ON "tools" USING btree ("price");--> statement-breakpoint
CREATE INDEX "tools_license_idx" ON "tools" USING btree ("license");--> statement-breakpoint
CREATE INDEX "tools_stack_idx" ON "tools" USING btree ("stack");--> statement-breakpoint
CREATE INDEX "tools_oss_idx" ON "tools" USING btree ("oss");--> statement-breakpoint
CREATE INDEX "tools_stable_key_idx" ON "tools" USING btree ("stable_key");--> statement-breakpoint
CREATE INDEX "tools_name_desc_idx" ON "tools" USING gin (to_tsvector('english', coalesce("name", '') || ' ' || coalesce("description", '')));--> statement-breakpoint
CREATE INDEX "tools_name_desc_trgm_idx" ON "tools" USING gin ((coalesce("name", '') || ' ' || coalesce("description", '')) gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "tools_developer_name_idx" ON "tools" USING btree ("developer","name");--> statement-breakpoint
CREATE INDEX "tools_category_name_idx" ON "tools" USING btree ("category","name");--> statement-breakpoint
CREATE UNIQUE INDEX "user_gpu_unique" ON "user_favorites" USING btree ("user_id","gpu_uuid");--> statement-breakpoint
CREATE UNIQUE INDEX "user_model_unique" ON "user_model_favorites" USING btree ("user_id","model_id");--> statement-breakpoint
CREATE INDEX "user_model_favorites_model_id_idx" ON "user_model_favorites" USING btree ("model_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_tool_unique" ON "user_tool_favorites" USING btree ("user_id","tool_stable_key");--> statement-breakpoint
CREATE INDEX "user_tool_favorites_tool_stable_key_idx" ON "user_tool_favorites" USING btree ("tool_stable_key");
