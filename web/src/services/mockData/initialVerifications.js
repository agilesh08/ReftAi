// Initial Mock Verifications for Reft.AI

export const initialVerifications = [
  {
    verificationId: "VR-2026-9041",
    orderId: "ORD-88219",
    status: "IN_PROGRESS",
    assessmentState: "REVIEW_REQUIRED",
    confidence: 0.72,
    productName: "Sony WH-1000XM5 Wireless Headphones",
    productId: "prod-001",
    refundAmount: 29990.0,
    refundReason: "Right ear cup slider cracked upon arrival; audio cutting out intermittently.",
    evidenceCount: 2,
    createdAt: "2026-10-28T14:30:00Z",
    isHeld: false,
    holdUntil: null,
    holdReason: null,
    latestDecision: null,
    recommendationLabel: "Review Required • Structural crack observed on right hinge slider",
    customerLink: "http://localhost:5173/verify/VR-2026-9041",
    token: "VR-2026-9041",
    maxAttempts: 2,
    claim: {
      customer_name: "Rahul Verma",
      customer_contact: "+91 98765 43210",
      customer_email: "rahul.verma@example.com",
      order_id: "ORD-88219",
      refund_reason: "Right ear cup slider cracked upon arrival; audio cutting out intermittently.",
      refund_amount: 29990.0,
      claimed_item_condition: "Cracked slider arm / Physical Damage",
      order_date: "2026-10-25T11:20:00Z",
      delivery_date: "2026-10-28T13:10:00Z"
    },
    product: {
      id: "prod-001",
      name: "Sony WH-1000XM5 Wireless Headphones",
      sku: "SONY-WH1000XM5-BLK",
      price: 29990.0,
      reference_count: 4,
      reference_processing_status: "READY"
    },
    verification: {
      verification_id: "VR-2026-9041",
      order_id: "ORD-88219",
      status: "IN_PROGRESS",
      created_at: "2026-10-28T14:30:00Z",
      customer_email: "rahul.verma@example.com"
    },
    questionsAsked: [
      {
        step_key: "step_refund_reason",
        title: "Select Refund Reason",
        answer: "Product arrived damaged (Right ear cup slider crack)",
        required: true,
        submitted: true
      },
      {
        step_key: "step_initial_proof",
        title: "Show Us the Issue (Camera Photo)",
        answer: "Evidence submitted (1 photo uploaded)",
        required: true,
        submitted: true
      },
      {
        step_key: "step_delivery_confirm",
        title: "Package Delivery Condition",
        answer: "Outer carton was intact, no courier damage visible",
        required: false,
        submitted: true
      }
    ],
    adaptiveFollowUpQuestions: [
      {
        id: "req-fup-01",
        prompt: "Please take a close-up photo of the hinge seam showing the right ear cup joint.",
        reason: "Clarify whether damage is stress fracture or external impact mark",
        status: "COMPLETED",
        customer_response: "Uploaded close-up joint photo showing clean plastic fracture along the molding seam.",
        requested_evidence_type: "CUSTOMER_IMAGE"
      },
      {
        id: "req-fup-02",
        prompt: "Did you notice any loose plastic fragments inside the carrying case or unboxing wrapper?",
        reason: "Determine if breakage occurred inside packaging prior to unpacking",
        status: "COMPLETED",
        customer_response: "Yes, small fragment was found inside the zippered case slot.",
        requested_evidence_type: "MCQ",
        options: ["Yes, fragments inside case", "No fragments found", "Not sure"]
      }
    ],
    evidenceItems: [
      {
        id: "ev-001",
        evidenceType: "CUSTOMER_IMAGE",
        workflowStepKey: "step_initial_proof",
        originalFilename: "damage_hinge_overhead.jpg",
        sha256Hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        createdAt: "2026-10-28T14:35:12Z",
        isDuplicate: false,
        previewUrl: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80",
        analysis: {
          capture_method: "DIRECT_PHYSICAL_APPEARANCE",
          quality: "SHARP_CLEAR",
          lighting: "NATURAL_AMBIENT",
          observed_damage: ["Visible fissure along right slider hinge", "Surface scuff near adjustment band"],
          product_consistency: "Matches Sony WH-1000XM5 Black matte texture and headband profile",
          epistemic_findings: {
            observed: ["Right slider crack", "Sony embossed typography"],
            not_observed: ["Internal driver wire severance", "Liquid ingress"],
            unclear: ["Extent of internal hinge retainer damage"]
          }
        }
      },
      {
        id: "ev-002",
        evidenceType: "CUSTOMER_IMAGE",
        workflowStepKey: "req-fup-01",
        originalFilename: "hinge_joint_macro.jpg",
        sha256Hash: "f4a1c55298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b999",
        createdAt: "2026-10-28T14:42:05Z",
        isDuplicate: false,
        previewUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80",
        analysis: {
          capture_method: "DIRECT_PHYSICAL_APPEARANCE",
          quality: "SHARP_CLEAR",
          observed_damage: ["Clean hairline fracture across pivot knuckle"],
          product_consistency: "Consistent with genuine merchandise"
        }
      }
    ],
    visualFindings: {
      observed: [
        "Hairline fracture on right ear cup pivot slider arm",
        "Genuine Sony branding and matte black finish match baseline profile",
        "Direct physical photograph captured via mobile camera (not a screen photo)"
      ],
      notObserved: [
        "No evidence of water damage or burn marks",
        "No external blunt force gouges on outer acoustic ear cup"
      ],
      unclear: [
        "Internal electrical wiring status cannot be confirmed from exterior photos"
      ]
    },
    deterministicSignals: [
      {
        name: "Order Delivery Status",
        source: "COURIER_API",
        value: "Delivered 1 hour 20 minutes before claim creation",
        status: "PASS",
        weight: 1.0
      },
      {
        name: "Customer Purchase Frequency",
        source: "MERCHANT_DATABASE",
        value: "Loyal Tier (4 previous orders, 0 previous refunds)",
        status: "PASS",
        weight: 0.95
      },
      {
        name: "Payment Proof Match",
        source: "RAZORPAY_GATEWAY",
        value: "Transaction ID matches ₹29,990.00 via UPI",
        status: "PASS",
        weight: 1.0
      },
      {
        name: "Image Metadata & Forensic Hash",
        source: "SYSTEM_FORENSICS",
        value: "EXIF Timestamp aligns with claim window; Unique SHA-256",
        status: "PASS",
        weight: 0.95
      }
    ],
    llamaReasoning: {
      summary: "Customer provides authentic high-resolution physical photos displaying a structural hinge failure on a genuine Sony WH-1000XM5 unit delivered recently. Prior order history is pristine. Review is recommended to determine whether merchant replacement or full manufacturer warranty replacement is favored.",
      confidence: 0.72
    },
    fusionResult: {
      overallConfidence: 0.72,
      assessmentState: "REVIEW_REQUIRED",
      contradictions: [],
      explanation: {
        summary: "Visual evidence verifies genuine product and visible physical defect matching claim description. No transactional or temporal contradictions detected."
      }
    },
    timeline: [
      {
        id: "tl-01",
        eventType: "SESSION_CREATED",
        description: "Merchant initiated verification session for Order #ORD-88219",
        timestamp: "2026-10-28T14:30:00Z",
        actor: "MERCHANT"
      },
      {
        id: "tl-02",
        eventType: "CUSTOMER_STARTED",
        description: "Customer opened secure verification link and accepted policy disclosure",
        timestamp: "2026-10-28T14:32:15Z",
        actor: "CUSTOMER"
      },
      {
        id: "tl-03",
        eventType: "EVIDENCE_UPLOADED",
        description: "Initial proof photo uploaded: damage_hinge_overhead.jpg",
        timestamp: "2026-10-28T14:35:12Z",
        actor: "CUSTOMER"
      },
      {
        id: "tl-04",
        eventType: "ADAPTIVE_FOLLOWUP_ISSUED",
        description: "AI Engine generated follow-up request for close-up hinge joint photo",
        timestamp: "2026-10-28T14:36:00Z",
        actor: "AI_ENGINE"
      },
      {
        id: "tl-05",
        eventType: "EVIDENCE_UPLOADED",
        description: "Follow-up photo uploaded: hinge_joint_macro.jpg",
        timestamp: "2026-10-28T14:42:05Z",
        actor: "CUSTOMER"
      },
      {
        id: "tl-06",
        eventType: "AI_FUSION_COMPLETED",
        description: "Multi-source evidence fusion assessed claim as REVIEW_REQUIRED (72% confidence)",
        timestamp: "2026-10-28T14:43:10Z",
        actor: "AI_ENGINE"
      }
    ],
    merchantDecision: null
  },

  {
    verificationId: "VR-2026-7812",
    orderId: "ORD-55421",
    status: "COMPLETED",
    assessmentState: "EVIDENCE_CONSISTENT",
    confidence: 0.94,
    productName: "Logitech MX Master 3S Wireless Mouse",
    productId: "prod-002",
    refundAmount: 8995.0,
    refundReason: "Scroll wheel ratchet mechanism detached inside casing; free-spinning with zero resistance.",
    evidenceCount: 3,
    createdAt: "2026-10-27T09:15:00Z",
    isHeld: false,
    holdUntil: null,
    latestDecision: "REFUND_APPROVED",
    recommendationLabel: "Evidence Consistent • Full alignment with hardware defect profile",
    customerLink: "http://localhost:5173/verify/VR-2026-7812",
    token: "VR-2026-7812",
    maxAttempts: 1,
    claim: {
      customer_name: "Pooja Sharma",
      customer_contact: "+91 91234 56789",
      customer_email: "pooja.sharma@example.com",
      order_id: "ORD-55421",
      refund_reason: "Scroll wheel ratchet mechanism detached inside casing; free-spinning with zero resistance.",
      refund_amount: 8995.0,
      claimed_item_condition: "Mechanical Failure",
      order_date: "2026-10-22T10:00:00Z",
      delivery_date: "2026-10-26T16:00:00Z"
    },
    product: {
      id: "prod-002",
      name: "Logitech MX Master 3S Wireless Mouse",
      sku: "LOGI-MXM3S-GRY",
      price: 8995.0,
      reference_count: 4,
      reference_processing_status: "READY"
    },
    verification: {
      verification_id: "VR-2026-7812",
      order_id: "ORD-55421",
      status: "COMPLETED",
      created_at: "2026-10-27T09:15:00Z"
    },
    questionsAsked: [
      {
        step_key: "step_refund_reason",
        title: "Select Refund Reason",
        answer: "Defective or not functioning (Scroll wheel loose)",
        required: true,
        submitted: true
      }
    ],
    adaptiveFollowUpQuestions: [],
    evidenceItems: [
      {
        id: "ev-010",
        evidenceType: "CUSTOMER_IMAGE",
        workflowStepKey: "step_initial_proof",
        originalFilename: "mouse_scroll_wheel.jpg",
        sha256Hash: "b890123498fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b111",
        createdAt: "2026-10-27T09:20:00Z",
        isDuplicate: false,
        previewUrl: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=80",
        analysis: {
          capture_method: "DIRECT_PHYSICAL_APPEARANCE",
          quality: "SHARP_CLEAR",
          observed_damage: ["Wheel tilt misaligned from center housing"],
          product_consistency: "Identical to genuine MX Master 3S Graphite model"
        }
      }
    ],
    visualFindings: {
      observed: ["Scroll wheel tilted off central axle housing", "Genuine Logitech serial label on base"],
      notObserved: ["No scratches or drops on chassis"],
      unclear: []
    },
    deterministicSignals: [
      { name: "Courier Delivery", source: "COURIER_API", value: "Verified delivered", status: "PASS", weight: 1.0 },
      { name: "Payment Match", source: "PAYMENT_GATEWAY", value: "Exact match ₹8,995", status: "PASS", weight: 1.0 }
    ],
    llamaReasoning: {
      summary: "Clear mechanical defect demonstrated on verified authentic product. Highly consistent claim with full payment alignment.",
      confidence: 0.94
    },
    fusionResult: {
      overallConfidence: 0.94,
      assessmentState: "EVIDENCE_CONSISTENT",
      contradictions: []
    },
    timeline: [
      {
        id: "tl-21",
        eventType: "DECISION_RECORDED",
        description: "Merchant approved full refund of ₹8,995.00",
        timestamp: "2026-10-27T10:00:00Z",
        actor: "MERCHANT"
      }
    ],
    merchantDecision: {
      decision: "REFUND_APPROVED",
      actionTaken: "FULL_REFUND",
      notes: "Clear defective scroll wheel confirmed. Full refund issued.",
      decidedAt: "2026-10-27T10:00:00Z",
      refundAmount: 8995.0
    }
  },

  {
    verificationId: "VR-2026-6309",
    orderId: "ORD-33104",
    status: "COMPLETED",
    assessmentState: "INCONSISTENCY_DETECTED",
    confidence: 0.88,
    productName: "Sony WH-1000XM5 Wireless Headphones",
    productId: "prod-001",
    refundAmount: 29990.0,
    refundReason: "Customer claims wrong item arrived in the box.",
    evidenceCount: 1,
    createdAt: "2026-10-26T16:00:00Z",
    isHeld: false,
    holdUntil: null,
    latestDecision: "REFUND_REJECTED",
    recommendationLabel: "Inconsistency Detected • Evidence photo photographed from laptop display screen",
    customerLink: "http://localhost:5173/verify/VR-2026-6309",
    token: "VR-2026-6309",
    maxAttempts: 1,
    claim: {
      customer_name: "Amit Patel",
      customer_contact: "+91 97777 88888",
      customer_email: "amit.patel@example.com",
      order_id: "ORD-33104",
      refund_reason: "Customer claims wrong item arrived in the box.",
      refund_amount: 29990.0
    },
    product: {
      id: "prod-001",
      name: "Sony WH-1000XM5 Wireless Headphones",
      sku: "SONY-WH1000XM5-BLK",
      price: 29990.0,
      reference_count: 4,
      reference_processing_status: "READY"
    },
    verification: {
      verification_id: "VR-2026-6309",
      order_id: "ORD-33104",
      status: "COMPLETED",
      created_at: "2026-10-26T16:00:00Z"
    },
    questionsAsked: [],
    adaptiveFollowUpQuestions: [],
    evidenceItems: [
      {
        id: "ev-020",
        evidenceType: "CUSTOMER_IMAGE",
        workflowStepKey: "step_initial_proof",
        originalFilename: "screen_grab_photo.jpg",
        createdAt: "2026-10-26T16:10:00Z",
        previewUrl: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80",
        analysis: {
          capture_method: "SCREEN_PHOTO",
          screen_artifacts_detected: ["Visible display pixel moire grid", "Monitor bezel reflection on top corner"],
          product_consistency: "Image is a photograph of an online promotional photo taken off a computer screen, not physical merchandise"
        }
      }
    ],
    visualFindings: {
      observed: ["Digital monitor moiré patterns and screen bezel reflection"],
      notObserved: ["No direct physical object present in camera environment"],
      unclear: []
    },
    deterministicSignals: [
      { name: "Capture Authenticity Check", source: "VISION_AI", value: "SCREEN_PHOTO detected", status: "FAIL", weight: 1.0 }
    ],
    llamaReasoning: {
      summary: "Forensic inspection detected that the evidence submission is a photo taken of a computer screen rather than actual physical goods. Does not meet verification criteria.",
      confidence: 0.88
    },
    fusionResult: {
      overallConfidence: 0.88,
      assessmentState: "INCONSISTENCY_DETECTED",
      contradictions: [
        "Customer evidence is a photograph of another display screen rather than physical merchandise."
      ]
    },
    timeline: [
      {
        id: "tl-31",
        eventType: "DECISION_RECORDED",
        description: "Merchant rejected refund claim due to unverified evidence",
        timestamp: "2026-10-26T17:00:00Z",
        actor: "MERCHANT"
      }
    ],
    merchantDecision: {
      decision: "REFUND_REJECTED",
      actionTaken: "NO_REFUND",
      notes: "Evidence submitted was a photograph of a screen displaying a photo from the internet.",
      rejectionReasons: ["Evidence shows no defect or damage", "Item does not match product reference specifications"],
      decidedAt: "2026-10-26T17:00:00Z"
    }
  },

  {
    verificationId: "VR-2026-4410",
    orderId: "ORD-12093",
    status: "HELD",
    assessmentState: "REVIEW_REQUIRED",
    confidence: 0.65,
    productName: "Keychron Q1 Pro Mechanical Keyboard",
    productId: "prod-004",
    refundAmount: 18499.0,
    refundReason: "Bluetooth connectivity failing intermittently on macOS.",
    evidenceCount: 1,
    createdAt: "2026-10-29T11:00:00Z",
    isHeld: true,
    holdUntil: "2026-10-31T11:00:00Z",
    holdReason: "Awaiting physical courier pickup and hardware diagnostic",
    latestDecision: "HOLD",
    recommendationLabel: "Paused by Merchant • On Hold",
    customerLink: "http://localhost:5173/verify/VR-2026-4410",
    token: "VR-2026-4410",
    maxAttempts: 2,
    claim: {
      customer_name: "Sneha Nair",
      customer_contact: "+91 95555 12345",
      order_id: "ORD-12093",
      refund_reason: "Bluetooth connectivity failing intermittently on macOS.",
      refund_amount: 18499.0
    },
    product: {
      id: "prod-004",
      name: "Keychron Q1 Pro Mechanical Keyboard",
      sku: "KEY-Q1PRO-RGB",
      price: 18499.0,
      reference_count: 4,
      reference_processing_status: "PROCESSING"
    },
    verification: {
      verification_id: "VR-2026-4410",
      order_id: "ORD-12093",
      status: "HELD",
      created_at: "2026-10-29T11:00:00Z"
    },
    questionsAsked: [],
    adaptiveFollowUpQuestions: [],
    evidenceItems: [],
    visualFindings: { observed: [], notObserved: [], unclear: [] },
    deterministicSignals: [],
    timeline: [
      {
        id: "tl-41",
        eventType: "SESSION_HELD",
        description: "Merchant placed session on hold for 48 hours",
        timestamp: "2026-10-29T11:15:00Z",
        actor: "MERCHANT"
      }
    ],
    merchantDecision: null
  },

  {
    verificationId: "VR-2026-2291",
    orderId: "ORD-99382",
    status: "CREATED",
    assessmentState: null,
    confidence: null,
    productName: "Sony WH-1000XM5 Wireless Headphones",
    productId: "prod-001",
    refundAmount: 29990.0,
    refundReason: "Customer requested return due to incorrect color delivered.",
    evidenceCount: 0,
    createdAt: "2026-10-30T08:00:00Z",
    isHeld: false,
    holdUntil: null,
    latestDecision: null,
    recommendationLabel: null,
    customerLink: "http://localhost:5173/verify/VR-2026-2291",
    token: "VR-2026-2291",
    maxAttempts: 2,
    claim: {
      customer_name: "Devendra S.",
      customer_contact: "+91 98888 77777",
      customer_email: "devendra@example.com",
      order_id: "ORD-99382",
      refund_reason: "Customer requested return due to incorrect color delivered.",
      refund_amount: 29990.0
    },
    product: {
      id: "prod-001",
      name: "Sony WH-1000XM5 Wireless Headphones",
      sku: "SONY-WH1000XM5-BLK",
      price: 29990.0,
      reference_count: 4,
      reference_processing_status: "READY"
    },
    verification: {
      verification_id: "VR-2026-2291",
      order_id: "ORD-99382",
      status: "CREATED",
      created_at: "2026-10-30T08:00:00Z"
    },
    questionsAsked: [],
    adaptiveFollowUpQuestions: [],
    evidenceItems: [],
    visualFindings: { observed: [], notObserved: [], unclear: [] },
    deterministicSignals: [],
    timeline: [
      {
        id: "tl-51",
        eventType: "SESSION_CREATED",
        description: "Merchant created new verification session for Order #ORD-99382",
        timestamp: "2026-10-30T08:00:00Z",
        actor: "MERCHANT"
      }
    ],
    merchantDecision: null
  }
];
