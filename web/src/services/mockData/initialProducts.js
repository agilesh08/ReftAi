// Initial Mock Products mirroring Reft.AI merchant database

export const initialProducts = [
  {
    id: "prod-001",
    name: "Sony WH-1000XM5 Wireless Headphones",
    sku: "SONY-WH1000XM5-BLK",
    price: 29990.0,
    description: "Premium industry-leading noise canceling wireless over-ear headphones in Black.",
    reference_count: 4,
    reference_processing_status: "READY",
    created_at: "2026-09-10T10:00:00Z",
    references: [
      {
        angle: "FRONT",
        filename: "wh1000xm5_front.jpg",
        status: "READY",
        uploaded_at: "2026-09-10T10:05:00Z",
        preview_url: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80",
        visual_metadata: {
          surface_finish: "Matte black synthetic leather and plastic",
          controls: "Touch sensor on right ear cup, power button on left",
          branding: "Sony logo engraved in silver on upper headband yoke"
        }
      },
      {
        angle: "BACK",
        filename: "wh1000xm5_back.jpg",
        status: "READY",
        uploaded_at: "2026-09-10T10:06:00Z",
        preview_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80",
        visual_metadata: {
          surface_finish: "Seamless contoured outer slider",
          labeling: "Model number and serial barcode printed on inner headband"
        }
      },
      {
        angle: "LEFT",
        filename: "wh1000xm5_left.jpg",
        status: "READY",
        uploaded_at: "2026-09-10T10:07:00Z",
        preview_url: "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&auto=format&fit=crop&q=80",
        visual_metadata: {
          ports: "3.5mm stereo mini jack, NC/AMB button"
        }
      },
      {
        angle: "RIGHT",
        filename: "wh1000xm5_right.jpg",
        status: "READY",
        uploaded_at: "2026-09-10T10:08:00Z",
        preview_url: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&auto=format&fit=crop&q=80",
        visual_metadata: {
          ports: "USB Type-C charging port and charging indicator LED"
        }
      }
    ]
  },
  {
    id: "prod-002",
    name: "Logitech MX Master 3S Wireless Mouse",
    sku: "LOGI-MXM3S-GRY",
    price: 8995.0,
    description: "Performance wireless mouse with 8K DPI tracking and quiet clicks in Graphite.",
    reference_count: 4,
    reference_processing_status: "READY",
    created_at: "2026-09-15T11:30:00Z",
    references: [
      {
        angle: "FRONT",
        filename: "mx3s_front.jpg",
        status: "READY",
        uploaded_at: "2026-09-15T11:32:00Z",
        preview_url: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=80",
        visual_metadata: {
          scroll_wheel: "MagSpeed electromagnetic steel wheel",
          buttons: "Left/Right click with matte textured rubberized grip"
        }
      },
      {
        angle: "BACK",
        filename: "mx3s_back.jpg",
        status: "READY",
        uploaded_at: "2026-09-15T11:33:00Z",
        preview_url: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&auto=format&fit=crop&q=80"
      },
      {
        angle: "LEFT",
        filename: "mx3s_left.jpg",
        status: "READY",
        uploaded_at: "2026-09-15T11:34:00Z",
        preview_url: "https://images.unsplash.com/photo-1626218174358-7769486c4b79?w=800&auto=format&fit=crop&q=80"
      },
      {
        angle: "RIGHT",
        filename: "mx3s_right.jpg",
        status: "READY",
        uploaded_at: "2026-09-15T11:35:00Z",
        preview_url: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=800&auto=format&fit=crop&q=80"
      }
    ]
  },
  {
    id: "prod-003",
    name: "Apple Watch Series 9 GPS 45mm",
    sku: "APL-W9-45-MID",
    price: 44900.0,
    description: "Midnight Aluminum Case with Midnight Sport Band - M/L.",
    reference_count: 3,
    reference_processing_status: "NOT_READY",
    created_at: "2026-10-01T09:15:00Z",
    references: [
      {
        angle: "FRONT",
        filename: "watch9_front.jpg",
        status: "READY",
        uploaded_at: "2026-10-01T09:20:00Z",
        preview_url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&auto=format&fit=crop&q=80"
      },
      {
        angle: "BACK",
        filename: "watch9_back.jpg",
        status: "READY",
        uploaded_at: "2026-10-01T09:22:00Z",
        preview_url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80"
      },
      {
        angle: "LEFT",
        filename: "watch9_left.jpg",
        status: "READY",
        uploaded_at: "2026-10-01T09:25:00Z",
        preview_url: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&auto=format&fit=crop&q=80"
      }
    ]
  },
  {
    id: "prod-004",
    name: "Keychron Q1 Pro Mechanical Keyboard",
    sku: "KEY-Q1PRO-RGB",
    price: 18499.0,
    description: "Wireless Custom Mechanical Keyboard with CNC Aluminum Body and Double-Gasket.",
    reference_count: 4,
    reference_processing_status: "PROCESSING",
    created_at: "2026-10-18T14:00:00Z",
    references: [
      { angle: "FRONT", filename: "q1_front.jpg", status: "PROCESSING", uploaded_at: "2026-10-18T14:02:00Z" },
      { angle: "BACK", filename: "q1_back.jpg", status: "READY", uploaded_at: "2026-10-18T14:04:00Z" },
      { angle: "LEFT", filename: "q1_left.jpg", status: "READY", uploaded_at: "2026-10-18T14:05:00Z" },
      { angle: "RIGHT", filename: "q1_right.jpg", status: "READY", uploaded_at: "2026-10-18T14:06:00Z" }
    ]
  }
];
