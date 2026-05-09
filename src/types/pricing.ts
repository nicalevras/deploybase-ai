// Provider types
export type Provider = "coreweave" | "nebius" | "hyperstack" | "runpod" | "lambda" | "digitalocean" | "oracle" | "crusoe" | "flyio" | "vultr" | "latitude" | "ori" | "voltagepark" | "googlecloud" | "verda" | "scaleway" | "replicate" | "thundercompute" | "koyeb" | "sesterce" | "aws" | "azure" | "civo" | "vast" | "hotaisle" | "alibaba" | "oblivus" | "paperspace" | "togetherai";

// CoreWeave pricing schema
type CoreWeavePriceRow = {
  provider: "coreweave";
  source_url: string;           // e.g., https://www.coreweave.com/pricing
  observed_at: string;          // ISO timestamp when you scraped
  instance_id?: string;         // e.g., "nvidia-gb200-nvl72"
  sku?: string;                 // not present in HTML; leave undefined
  region?: string;              // CoreWeave marketing page is global; leave undefined
  zone?: string;                // leave undefined

  // Hardware
  gpu_model?: string;           // e.g., "NVIDIA GB200 NVL72", "H100 PCIe"
  gpu_count?: number;           // integer parsed from "GPU Count"
  vram_gb?: number;             // number parsed from "VRAM"
  vcpus?: number;               // integer parsed from "vCPUs"
  system_ram_gb?: number;       // integer parsed from "System RAM"
  local_storage_tb?: number;    // number parsed from "Local Storage (TB)"

  // Pricing
  price_unit: "hour" | "month" | "gb_month"; // price units vary by service
  price_hour_usd?: number;      // numeric value for hourly rates
  price_month_usd?: number;     // numeric value for monthly rates
  raw_cost?: string;            // original text such as "$49.24" or "$0.110/GB/mo*"
  billing_notes?: string;       // freeform for footnotes (e.g., "superscript 1")

  // Flags
  class: "GPU";                  // GPU rows only
  network?: "InfiniBand" | "Ethernet" | "Unknown"; // hint from name/ID (contains "IB" => InfiniBand)
  spot?: boolean;               // marketing page lists on‑demand rates; leave undefined
  type?: "Virtual Machine" | "Bare Metal";    // instance type
};

// Nebius pricing schema
export type NebiusPriceRow = {
  provider: "nebius";
  source_url: string;           // https://nebius.com/prices
  observed_at: string;          // ISO timestamp

  // Compute identifiers
  item: string;                 // e.g. "NVIDIA HGX H100"
  sku?: string;                 // optional variant key, e.g. L40S Intel vs AMD CPU rows
  gpu_model?: string;           // normalized copy of item for downstream consumers
  class: "GPU";                 // GPU table only

  // Hardware
  gpu_count?: number;           // Always 1 for GPU instances
  vram_gb?: number;             // VRAM in GB (from hardcoded lookup)

  // Specs (may be ranges)
  vcpus: string;                // "16", "8-40", etc.
  system_ram_gb?: number;       // normalized system RAM value

  // Pricing
  price_unit: "gpu_hour";       // per GPU-hour
  price_usd?: number;           // numeric price (e.g. 2.95); undefined if "Contact us"
  raw_cost: string;             // original price string (e.g. "$2.95", "from $1.82", "Contact us")

  // Flags
  type?: "Virtual Machine" | "Bare Metal";   // instance type
};

// (moved final union below to include Hyperstack)

// Hyperstack pricing schema (On-Demand GPU)
export type HyperstackPriceRow = {
  provider: "hyperstack";
  source_url: string;           // https://www.hyperstack.cloud/gpu-pricing
  observed_at: string;          // ISO timestamp

  // Identification
  instance_id?: string;         // slug of gpu_model (e.g., "nvidia-h100-sxm")

  // Hardware
  gpu_model: string;            // e.g., "NVIDIA H100 SXM"
  gpu_count: number;            // always 1 (per GPU pricing)
  vram_gb?: number;             // parsed from VRAM (GB)
  vcpus?: number;               // parsed from Max pCPUs per GPU
  system_ram_gb?: number;       // parsed from Max RAM (GB) per GPU

  // Pricing
  price_unit: "gpu_hour";      // per GPU-hour
  price_hour_usd?: number;      // numeric price value
  raw_cost?: string;            // original price text (e.g., "$2.40")

  // Flags
  class: "GPU";                // On-demand GPU rows only
  network?: "InfiniBand" | "Ethernet" | "Unknown"; // not specified
  type?: "Virtual Machine" | "Bare Metal";   // instance type
};

// RunPod pricing schema
export type RunPodPriceRow = {
  provider: "runpod";
  source_url: string;           // https://www.runpod.io/pricing
  observed_at: string;          // ISO timestamp

  // Identification
  instance_id?: string;         // deploy link parameter (e.g., "B200", "H100+NVL")

  // Hardware
  gpu_model: string;            // e.g., "B200", "H100 NVL"
  gpu_count: number;            // always 1 (per GPU pricing)
  vram_gb: number;              // VRAM in GB (e.g., 180, 94, 80)
  vcpus: number;                // vCPUs count (e.g., 28, 16, 20)
  system_ram_gb: number;        // System RAM in GB (e.g., 283, 94, 125)

  // Pricing
  price_unit: "gpu_hour";      // per GPU-hour
  price_hour_usd: number;       // hourly price in USD
  raw_cost: string;             // original price text (e.g., "$5.99", "$3.00")

  // Flags
  class: "GPU";                // GPU instances only
  type?: "Virtual Machine" | "Bare Metal";   // instance type
};

// Lambda pricing schema
export type LambdaPriceRow = {
  provider: "lambda";
  source_url: string;           // https://lambda.ai/pricing
  observed_at: string;          // ISO timestamp

  // Identification
  instance_id?: string;         // instance type (e.g., "8x-nvidia-b200-sxm6")

  // Hardware (total instance specs)
  gpu_model: string;            // e.g., "NVIDIA B200 SXM6"
  gpu_count: number;            // number of GPUs in instance (1, 2, 4, 8)
  vram_gb: number;              // TOTAL VRAM for instance (vram_per_gpu * gpu_count)
  vcpus: number;                // total vCPUs for the instance
  system_ram_gb: number;        // total RAM for the instance in GB
  storage: string;              // storage description (e.g., "22 TiB SSD")

  // Pricing
  price_unit: "instance_hour";  // per instance-hour (total price)
  price_hour_usd: number;       // total instance price per hour
  raw_cost: string;             // original price text

  // Flags
  class: "GPU";                // GPU instances only
  type?: "Virtual Machine" | "Bare Metal";   // instance type
};

// DigitalOcean pricing schema
export type DigitalOceanPriceRow = {
  provider: "digitalocean";
  source_url: string;           // https://www.digitalocean.com/pricing/gpu-droplets
  observed_at: string;          // ISO timestamp

  // Identification
  instance_id?: string;         // instance type (e.g., "nvidia-h100-x8")

  // Hardware
  gpu_model: string;            // e.g., "NVIDIA H100"
  gpu_count: number;            // number of GPUs in droplet (1 or 8)
  vram_gb: number;              // VRAM per GPU in GB
  vcpus: number;                // total vCPUs for the droplet
  system_ram_gb: number;        // total RAM for the droplet in GB
  storage: string;              // storage description

  // Network
  transfer_gb?: number;         // transfer allowance in GB

  // Pricing (on-demand only)
  price_unit: "gpu_hour" | "instance_hour";  // per GPU-hour or per instance-hour for multi-GPU
  price_hour_usd: number;       // price per GPU per hour or total instance price
  raw_cost: string;             // original price text

  // Flags
  class: "GPU";                // GPU instances only
  type?: "Virtual Machine" | "Bare Metal";   // instance type
};

// Oracle pricing schema
export type OraclePriceRow = {
  provider: "oracle";
  source_url: string;           // https://www.oracle.com/cloud/price-list/
  observed_at: string;          // ISO timestamp

  // Identification
  instance_id?: string;         // instance type (e.g., "BM.GPU.B200.8")

  // Hardware
  gpu_model: string;            // e.g., "NVIDIA B200"
  gpu_count: number;            // number of GPUs in instance
  vram_gb: number;              // total VRAM in GB (not per GPU)
  vcpus?: number;               // total vCPUs (optional - not always available)
  system_ram_gb?: number;       // total RAM in GB (optional - not always available)
  storage: string;              // storage description
  network: string;              // network description

  // Architecture
  architecture: string;         // e.g., "Blackwell", "Hopper"
  interconnect: string;         // e.g., "NVIDIA NVLINK"

  // Pricing (per instance, calculated from per-GPU pricing)
  price_unit: "instance_hour";  // per instance-hour (total cost)
  price_hour_usd?: number;      // total instance price per hour; omitted when Oracle does not expose a price
  raw_cost: string;             // original price text

  // Flags
  class: "GPU";                // GPU instances only
  type?: "Virtual Machine" | "Bare Metal";   // instance type (BM = Bare Metal, VM = Virtual Machine)
};

// Crusoe pricing schema
export type CrusoePriceRow = {
  provider: "crusoe";
  source_url: string;           // https://www.crusoe.ai/cloud/pricing
  observed_at: string;          // ISO timestamp

  // Identification
  instance_id?: string;         // GPU model identifier (e.g., "NVIDIA B200")

  // Hardware
  gpu_model: string;            // e.g., "NVIDIA B200"
  gpu_count: number;            // always 1 for Crusoe (single GPU instances)
  vram_gb: number;              // VRAM per GPU in GB
  gpu_interface: string;        // e.g., "SXM", "PCIe"

  // System specs (from research/mapping)
  vcpus: number;                // CPU cores for the instance
  system_ram_gb: number;        // RAM for the instance in GB

  // Pricing (on-demand only)
  price_unit: "gpu_hour";      // per GPU-hour
  price_hour_usd?: number;      // price per GPU per hour (undefined for contact sales)
  contact_sales?: boolean;      // true if pricing requires contacting sales
  raw_cost: string;             // original price text

  // Flags
  class: "GPU";                // GPU instances only
  type?: "Virtual Machine" | "Bare Metal";   // instance type
};

// Fly.io pricing schema
export type FlyioPriceRow = {
  provider: "flyio";
  source_url: string;           // https://fly.io/gpu
  observed_at: string;          // ISO timestamp

  // Identification
  instance_id?: string;         // GPU model identifier

  // Hardware
  gpu_model: string;            // e.g., "NVIDIA L40S"
  gpu_count: number;            // always 1 (per GPU pricing)
  vram_gb: number;              // VRAM per GPU in GB
  vcpus: number;                // 0 - GPU is an add-on, CPU is configurable
  system_ram_gb: number;        // 0 - GPU is an add-on, RAM is configurable

  // Pricing
  price_unit: "gpu_hour";       // per GPU-hour
  price_hour_usd: number;       // price per GPU per hour
  raw_cost: string;             // original price text

  // Optional
  regions?: string[];           // Available regions for this GPU

  // Flags
  class: "GPU";                 // GPU instances only
  type?: "Virtual Machine" | "Bare Metal";   // instance type
};

// Vultr pricing schema
export type VultrPriceRow = {
  provider: "vultr";
  source_url: string;           // https://www.vultr.com/pricing/
  observed_at: string;          // ISO timestamp

  // Identification
  instance_id?: string;         // e.g., "amd-mi355x-8x"

  // Hardware
  gpu_model: string;            // e.g., "AMD MI355X"
  gpu_count: number;            // Number of GPUs (1, 2, 4, 8)
  vram_gb: number;              // GPU RAM in GB
  vcpus: number;                // vCPU count
  system_ram_gb: number;        // System RAM in GB
  storage: string;              // Storage description (e.g., "13 TB")
  bandwidth?: string;           // Bandwidth allowance (e.g., "15 TB")

  // Pricing
  price_unit: "gpu_hour" | "instance_hour";  // per GPU-hour or per instance-hour
  price_hour_usd?: number;      // Price per GPU per hour (undefined for Contact Sales)
  raw_cost: string;             // Original price text
  contact_sales?: boolean;      // True if pricing requires contacting sales

  // Flags
  class: "GPU";                 // GPU instances only
  type: "Virtual Machine" | "Bare Metal";  // Required for Vultr (not optional)
};

// Latitude.sh pricing schema
export type LatitudePriceRow = {
  provider: "latitude";
  source_url: string;           // https://www.latitude.sh/pricing
  observed_at: string;          // ISO timestamp

  // Identification
  instance_id?: string;         // e.g., "vm.rtx6kpro.small"

  // Hardware
  gpu_model: string;            // e.g., "NVIDIA RTX6KPRO"
  gpu_count: number;            // Number of GPUs
  vram_gb?: number;             // GPU RAM in GB (if available)
  vcpus?: number;               // vCPU count
  system_ram_gb?: number;       // System RAM in GB
  storage?: string;             // Storage description

  // Pricing
  price_unit: "instance_hour";  // per instance-hour
  price_hour_usd?: number;      // Price per hour
  price_month_usd?: number;     // Monthly price (for reference)
  raw_cost: string;             // Original price text

  // Flags
  class: "GPU";                 // GPU instances only
  type: "Virtual Machine" | "Bare Metal";
};

// Ori pricing schema
export type OriPriceRow = {
  provider: "ori";
  source_url: string;           // https://www.ori.co/pricing
  observed_at: string;          // ISO timestamp

  // Identification
  instance_id?: string;         // e.g., "h200-1x"

  // Hardware
  gpu_model: string;            // e.g., "NVIDIA H200"
  gpu_count: number;            // 1 or 8
  vram_gb?: number;             // GPU VRAM in GB
  vcpus?: number;               // vCPU count
  system_ram_gb?: number;       // System RAM in GB
  storage?: string;             // Storage description

  // Pricing
  price_unit: "instance_hour";
  price_hour_usd: number;       // Hourly price
  raw_cost: string;             // Original price text

  // Flags
  class: "GPU";
  type: "Virtual Machine";
};

// Voltage Park pricing schema
export type VoltageParkPriceRow = {
  provider: "voltagepark";
  source_url: string;           // https://www.voltagepark.com/
  observed_at: string;          // ISO timestamp

  // Identification
  instance_id?: string;         // e.g., location_id-preset_id

  // Hardware
  gpu_model: string;            // e.g., "NVIDIA H100 SXM5"
  gpu_count: number;
  vram_gb?: number;
  vcpus?: number;
  system_ram_gb?: number;
  storage?: string;

  // Location
  region?: string;              // e.g., "Texas, US"

  // Pricing
  price_unit: "instance_hour";
  price_hour_usd: number;
  raw_cost: string;

  // Flags
  class: "GPU";
  type: "Virtual Machine" | "Bare Metal";
};

// Google Cloud pricing schema
export type GoogleCloudPriceRow = {
  provider: "googlecloud";
  source_url: string;           // https://cloud.google.com/compute/vm-instance-pricing
  observed_at: string;          // ISO timestamp

  // Identification
  instance_id?: string;         // e.g., "a2-highgpu-1g"
  sku?: string;                 // Machine type for stable key (same as instance_id)
  machine_family?: string;      // e.g., "A2 Standard", "A3 Ultra"

  // Hardware
  gpu_model: string;            // e.g., "NVIDIA A100 40GB"
  gpu_count: number;
  vram_gb?: number;
  vcpus?: number;
  system_ram_gb?: number;
  storage?: string;             // e.g., "375 GiB SSD"

  // Location
  region?: string;              // e.g., "us-central1"

  // Pricing
  price_unit: "instance_hour";
  price_hour_usd: number;
  raw_cost: string;

  // Flags
  class: "GPU";
  type: "Virtual Machine";
};

// Verda pricing schema
export type VerdaPriceRow = {
  provider: "verda";
  source_url: string;           // https://verda.com/products
  observed_at: string;          // ISO timestamp

  // Identification
  instance_id?: string;         // Instance name e.g., "8H100.80S.176V"
  sku?: string;                 // Same as instance_id for stable key

  // Hardware
  gpu_model: string;            // e.g., "NVIDIA H100 SXM5"
  gpu_count: number;
  vram_gb?: number;
  vcpus?: number;
  system_ram_gb?: number;

  // Pricing
  price_unit: "instance_hour";
  price_hour_usd: number;
  raw_cost: string;

  // Flags
  class: "GPU";
  type: "Virtual Machine";
};

// Scaleway pricing schema (EUR converted to USD)
export type ScalewayPriceRow = {
  provider: "scaleway";
  source_url: string;
  observed_at: string;

  // Identification
  instance_id?: string;         // e.g., "H100-1-80G"
  sku?: string;                 // Same as instance_id for stable key

  // Hardware
  gpu_model: string;            // e.g., "NVIDIA H100"
  gpu_count: number;
  vram_gb?: number;
  vcpus?: number;
  system_ram_gb?: number;

  // Pricing (converted from EUR)
  price_unit: "instance_hour";
  price_hour_usd: number;       // EUR × conversion rate
  raw_cost: string;             // Original EUR price

  // Flags
  class: "GPU";
  type: "Virtual Machine";
};

// Replicate pricing schema
export type ReplicatePriceRow = {
  provider: "replicate";
  source_url: string;
  observed_at: string;

  // Identification
  instance_id?: string;         // Hardware name (e.g., "Nvidia H100 GPU")
  sku?: string;                 // Slug (e.g., "gpu-h100")

  // Hardware
  gpu_model: string;            // e.g., "NVIDIA H100"
  gpu_count: number;
  vram_gb?: number;
  vcpus?: number;
  system_ram_gb?: number;

  // Pricing
  price_unit: "instance_hour";
  price_hour_usd: number;
  raw_cost: string;

  // Flags
  class: "GPU";
  type: "Virtual Machine";
};

// Thundercompute pricing schema
export type ThundercomputePriceRow = {
  provider: "thundercompute";
  source_url: string;
  observed_at: string;

  // Identification
  instance_id?: string;         // GPU name (e.g., "On-demand A100 80GB")
  sku?: string;                 // Generated SKU

  // Hardware
  gpu_model: string;            // e.g., "NVIDIA A100"
  gpu_count: number;            // Always 1 (pricing is per-GPU)
  vram_gb?: number;
  vcpus?: number;
  system_ram_gb?: number;

  // Pricing
  price_unit: "instance_hour";
  price_hour_usd: number;
  raw_cost: string;

  // Tier
  tier: "prototyping" | "production";

  // Flags
  class: "GPU";
  type: "Virtual Machine";
};

// Koyeb pricing schema
export type KoyebPriceRow = {
  provider: "koyeb";
  source_url: string;
  observed_at: string;

  // Identification
  instance_id?: string;         // Instance type name (e.g., "2x A100")
  sku?: string;                 // Same as instance type

  // Hardware
  gpu_model: string;            // e.g., "NVIDIA A100"
  gpu_count: number;
  vram_gb?: number;
  vcpus?: number;
  system_ram_gb?: number;

  // Pricing - nullable for "Request Access" instances
  price_unit: "instance_hour";
  price_hour_usd: number | null;
  raw_cost: string;

  // Flags
  class: "GPU";
  type: "Virtual Machine";
};

// Sesterce pricing schema (API-based)
export type SestercePriceRow = {
  provider: "sesterce";
  source_url: string;
  observed_at: string;

  // Identification
  instance_id: string;            // e.g., "B200_sxm6x8_NVLINK"
  sku?: string;

  // Hardware
  gpu_model: string;              // e.g., "NVIDIA B200"
  gpu_count: number;
  vram_gb?: number;
  vcpus?: number;
  system_ram_gb?: number;
  storage_gb?: number;

  // Sesterce-specific
  nvlink: boolean;
  interconnect?: string;          // e.g., "sxm6", "pcie"
  deployment_type: "vm" | "baremetal" | "container";

  // Pricing
  price_unit: "instance_hour";
  price_hour_usd: number;
  raw_cost: string;

  // Flags
  class: "GPU";
  type: "Virtual Machine" | "Bare Metal";
};

// AWS EC2 pricing schema (bulk price list)
export type AWSPriceRow = {
  provider: "aws";
  source_url: string;
  observed_at: string;

  // Identification
  instance_id: string;            // e.g., "p5.48xlarge"
  sku?: string;

  // Hardware
  gpu_model: string;              // e.g., "NVIDIA H100"
  gpu_count: number;
  vram_gb?: number;
  vcpus?: number;
  system_ram_gb?: number;

  // Pricing
  price_unit: "instance_hour";
  price_hour_usd: number;
  raw_cost: string;

  // Flags
  class: "GPU";
  type: "Virtual Machine";
};

// Azure pricing schema (Retail Prices API)
export type AzurePriceRow = {
  provider: "azure";
  source_url: string;
  observed_at: string;

  // Identification
  instance_id: string;            // e.g., "Standard_ND96isr_H100_v5"
  sku?: string;                   // Azure SKU ID

  // Hardware
  gpu_model: string;              // e.g., "NVIDIA H100"
  gpu_count: number;
  vram_gb?: number;
  vcpus?: number;
  system_ram_gb?: number;

  // Pricing
  price_unit: "instance_hour";
  price_hour_usd: number;
  raw_cost: string;

  // Flags
  class: "GPU";
  type: "Virtual Machine";
};

// Civo pricing schema (pricing page scrape)
export type CivoPriceRow = {
  provider: "civo";
  source_url: string;
  observed_at: string;

  // Identification
  instance_id: string;            // e.g., "civo-nvidia-l40s-1x"
  sku?: string;

  // Hardware
  gpu_model: string;              // e.g., "NVIDIA L40S"
  gpu_count: number;              // 1, 2, 4, or 8
  vram_gb: number;                // VRAM in GB (e.g., 48)
  vcpus: number;
  system_ram_gb: number;
  storage?: string;               // e.g., "200GB NVMe"

  // Pricing
  price_unit: "instance_hour";
  price_hour_usd?: number;          // Optional - N/A for some instances like B200
  raw_cost: string;

  // Flags
  class: "GPU";
  type: "Virtual Machine";
};

// Vast.ai pricing schema (API-based)
export type VastPriceRow = {
  provider: "vast";
  source_url: string;
  observed_at: string;

  // Identification
  instance_id: string;            // e.g., "vast-nvidia-rtx-4090-4x"

  // Hardware
  gpu_model: string;              // e.g., "RTX 4090"
  gpu_count: number;              // 1, 2, 4, 8
  vram_gb: number;                // Total VRAM in GB
  vcpus: number;
  system_ram_gb: number;

  // Pricing
  price_unit: "instance_hour";
  price_hour_usd: number;         // dph_total from API
  raw_cost: string;

  // Additional Vast-specific
  reliability?: number;           // Machine reliability score 0-1
  geolocation?: string;           // e.g., "US, CA"

  // Flags
  class: "GPU";
  type: "Virtual Machine";
};

// HotAisle pricing schema (HTML scrape)
export type HotAislePriceRow = {
  provider: "hotaisle";
  source_url: string;
  observed_at: string;

  // Identification
  instance_id: string;            // e.g., "hotaisle-mi300x-4x"
  size_name?: string;             // e.g., "Small", "Medium", "Large"

  // Hardware
  gpu_model: string;              // e.g., "AMD MI300X"
  gpu_count: number;              // 1, 2, 4, 8
  vram_gb: number;                // 192GB per MI300X
  vcpus: number;
  system_ram_gb: number;
  storage?: string;               // e.g., "12TB NVMe"

  // Pricing
  price_unit: "instance_hour";
  price_hour_usd: number;
  raw_cost: string;

  // Flags
  class: "GPU";
  type: "Virtual Machine" | "Bare Metal";
};

// Alibaba Cloud pricing schema (API)
export type AlibabaPriceRow = {
  provider: "alibaba";
  source_url: string;
  observed_at: string;

  // Identification
  instance_id: string;            // InstanceTypeId e.g., "ecs.gn7e-c16g1.16xlarge"
  instance_family: string;        // InstanceTypeFamily e.g., "ecs.gn7e"

  // Hardware (from API)
  gpu_model: string;              // GPUSpec e.g., "NVIDIA A100"
  gpu_count: number;              // GPUAmount
  vram_gb: number;                // GPUMemorySize
  vcpus: number;                  // CpuCoreCount
  system_ram_gb: number;          // MemorySize

  // Pricing
  price_unit: "instance_hour";
  price_hour_usd: number | null;  // TradePrice (null if unavailable)
  currency: string;               // CNY or USD

  // Flags
  class: "GPU";
  type: "Virtual Machine" | "Bare Metal" | "vGPU";
};

// Oblivus pricing schema (API)
export type OblivusPriceRow = {
  provider: "oblivus";
  source_url: string;
  observed_at: string;

  // Identification
  instance_id: string;            // flavorID e.g., "H100_SXM5_80GB_x8"
  gpu_model: string;              // metaName e.g., "H100 80GB SXM5"

  // Hardware
  gpu_count: number;              // GPUAmount
  vram_gb: number;                // GPU memory in GB
  vcpus: number;                  // vCPU
  system_ram_gb: number;          // RAM in GB
  storage_gb: number;             // ephemeralStorage + rootStorage

  // Pricing (per GPU/hour)
  price_unit: "gpu_hour";
  price_hour_usd: number;         // hourlyCost
  currency: "USD";

  // Network
  network: string;                // e.g., "100Gbps"

  // Flags
  class: "GPU";
  type: "Virtual Machine";
};

// Paperspace pricing schema (API)
export type PaperspacePriceRow = {
  provider: "paperspace";
  source_url: string;
  observed_at: string;

  // Identification
  instance_id: string;            // label e.g., "A6000", "H100x8"
  gpu_model: string;              // gpu e.g., "Ampere A6000"

  // Hardware
  gpu_count: number;
  vram_gb: number;                // Total VRAM (from metadata)
  vcpus: number;                  // cpus
  system_ram_gb: number;          // ram in GB

  // Pricing
  price_unit: "instance_hour";
  price_hour_usd: number;         // rateHourly
  currency: "USD";

  // Availability
  regions: string[];              // Available regions

  // Flags
  class: "GPU";
  type: "Virtual Machine";
};

// Together AI pricing schema (HTML scrape)
export type TogetherAIPriceRow = {
  provider: "togetherai";
  source_url: string;
  observed_at: string;

  // Identification
  instance_id: string;            // e.g., "hgx-h100-sxm-8x"
  gpu_model: string;              // e.g., "NVIDIA H100 SXM"

  // Hardware
  gpu_count: 8;                   // Always 8x GPU clusters
  vram_gb: number;                // Total VRAM (per GPU × 8)

  // Pricing
  price_unit: "cluster_hour";
  price_hour_usd: number;         // Total cluster hourly price
  currency: "USD";

  // Flags
  class: "GPU";
  type: "Virtual Machine";
};

// Union type for all price rows
export type PriceRow = CoreWeavePriceRow | NebiusPriceRow | HyperstackPriceRow | RunPodPriceRow | LambdaPriceRow | DigitalOceanPriceRow | OraclePriceRow | CrusoePriceRow | FlyioPriceRow | VultrPriceRow | LatitudePriceRow | OriPriceRow | VoltageParkPriceRow | GoogleCloudPriceRow | VerdaPriceRow | ScalewayPriceRow | ReplicatePriceRow | ThundercomputePriceRow | KoyebPriceRow | SestercePriceRow | AWSPriceRow | AzurePriceRow | CivoPriceRow | VastPriceRow | HotAislePriceRow | AlibabaPriceRow | OblivusPriceRow | PaperspacePriceRow | TogetherAIPriceRow;

export type ProviderSnapshot = {
  provider: Provider;
  version: number;             // monotonic
  last_updated: string;        // ISO (same as observed_at of the scrape run)
  rows: PriceRow[];
};

export interface ProviderResult {
  provider: Provider;
  rows: PriceRow[];
  observedAt: string; // ISO timestamp
  sourceHash: string;
  version?: number;
}
