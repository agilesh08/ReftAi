// Mock Workflows for Reft.AI verification builder

export const initialWorkflows = [
  {
    id: "wf-standard-01",
    name: "Standard Electronics Refund Verification",
    description: "Configured verification workflow with 4 scenarios and adaptive AI follow-ups",
    is_published: true,
    created_at: "2026-09-01T08:00:00Z",
    scenarios: [
      {
        id: "damaged",
        title: "Product arrived damaged",
        followUpQuestions: [
          "Please capture a closer photo showing the crack or damage clearly.",
          "Is the shipping box also crushed, torn, or wet?",
          "Please photograph the serial number or model barcode label."
        ]
      },
      {
        id: "defective",
        title: "Defective or not functioning",
        followUpQuestions: [
          "Does the item power on or display any status indicator lights?",
          "Please photograph the power connection or accessories used."
        ]
      },
      {
        id: "missing_parts",
        title: "Missing item or accessories",
        followUpQuestions: [
          "Please photograph all items and packaging received in the box.",
          "Was the outer courier tape broken or tampered with?"
        ]
      },
      {
        id: "wrong_item",
        title: "Received wrong product or variant",
        followUpQuestions: [
          "Please photograph the product label showing the model or barcode.",
          "Does the item match the description on your order receipt?"
        ]
      }
    ],
    steps: [
      {
        stepKey: "step_refund_reason",
        stepType: "MCQ",
        title: "Select Refund Reason",
        description: "Choose the option that best describes the issue with your item.",
        stepOrder: 1,
        required: true,
        config: {
          options: [
            { value: "damaged", label: "Product arrived damaged" },
            { value: "defective", label: "Defective or not functioning" },
            { value: "missing_parts", label: "Missing item or accessories" },
            { value: "wrong_item", label: "Received wrong product or variant" }
          ]
        }
      },
      {
        stepKey: "step_initial_proof",
        stepType: "CAMERA",
        title: "Show Us the Issue",
        description: "Take a clear photograph of the item condition using your camera.",
        stepOrder: 2,
        required: true,
        config: {
          camera_only: true,
          allow_gallery: false,
          tips: [
            "Keep entire product visible in the frame",
            "Ensure good lighting and avoid glare",
            "Focus on the specific damage or issue",
            "Keep the device steady while taking the photo"
          ]
        }
      },
      {
        stepKey: "step_payment_confirm",
        stepType: "PAYMENT",
        title: "Payment Account Confirmation",
        description: "Confirm your payment account identifier for refund processing (no CVV/passwords requested).",
        stepOrder: 3,
        required: false,
        config: {
          verify_account_id: true,
          expected_payment_account: "HDFC-****-8812"
        }
      },
      {
        stepKey: "step_delivery_confirm",
        stepType: "DELIVERY",
        title: "Package Delivery Condition",
        description: "Confirm delivery condition and courier packaging status.",
        stepOrder: 4,
        required: false
      }
    ]
  },
  {
    id: "wf-highvalue-02",
    name: "High-Value Merchandise Inspection",
    description: "Rigorous verification requiring multi-angle proof, payment statement and barcode verification",
    is_published: true,
    created_at: "2026-09-12T10:00:00Z",
    scenarios: [],
    steps: []
  }
];
