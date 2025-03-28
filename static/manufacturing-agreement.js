// Document order configuration for Manufacturing Agreement
const sectionOrder = ["DATE", "PARTIES", "AGREEMENT", "EXECUTION"];

// Section order for Agreement part
const agreementSectionOrder = [
  "1. Definitions",
  "2. BACKGROUND",
  "3. Term",
  "4. Order procedure",
  "5. Manufacturing",
  "6. Product Specification",
  "7. Minimum Quantity",
  "8. Forecasting",
  "9. Terms and conditions of supply",
  "10. Intellectual Property Rights",
  "11. Exclusivity",
  "12. Charges",
  "13. Payments",
  "14. Confidentiality obligations",
  "15. Warranties",
  "16. Indemnities",
  "17. Limitations and exclusions of liability",
  "18. Force Majeure Event",
  "19. Termination",
  "20. Effects of termination",
  "21. Notices",
  "22. General",
  "23. Interpretation",
];

/**
 * Flattens a nested object into a flat object with dot notation keys
 * @param {Object} obj - The nested object to flatten
 * @param {String} prefix - The prefix for keys (used in recursion)
 * @return {Object} A flat object with dot notation keys
 */
function flattenObject(obj, prefix = "") {
  return Object.keys(obj).reduce((acc, key) => {
    const prefixedKey = prefix ? `${prefix}.${key}` : key;

    if (
      typeof obj[key] === "object" &&
      obj[key] !== null &&
      !Array.isArray(obj[key])
    ) {
      // Recursively flatten nested objects
      Object.assign(acc, flattenObject(obj[key], prefixedKey));
    } else {
      // Add leaf node
      acc[prefixedKey] = obj[key];
    }

    return acc;
  }, {});
}

/**
 * Unflatten a flat object with dot notation keys back into a nested object
 * @param {Object} flatObj - The flat object to unflatten
 * @return {Object} A nested object
 */
function unflattenObject(flatObj) {
  const result = {};

  Object.keys(flatObj).forEach((key) => {
    const value = flatObj[key];
    const keys = splitPath(key);
    let current = result;

    // Navigate to the right spot in the result object
    keys.forEach((k, i) => {
      if (i === keys.length - 1) {
        // Set the value at the last key
        current[k] = value;
      } else {
        // Create the nested object if it doesn't exist
        current[k] = current[k] || {};
        current = current[k];
      }
    });
  });

  return result;
}

// Document template storage
let documentTemplate;

/**
 * Initialize the document template by storing a clean copy
 * of the initial document structure
 */
function initializeDocumentTemplate() {
  // Clone the initial document structure
  documentTemplate = JSON.parse(JSON.stringify(window.currentDocument));
}

/**
 * Get a clean copy of the document template
 * @return {Object} A fresh document template
 */
function getDocumentTemplate() {
  if (!documentTemplate) {
    initializeDocumentTemplate();
  }
  return JSON.parse(JSON.stringify(documentTemplate));
}

// Global variables to store selection information
let selectedText = "";
let selectionRange = null;

function handleTextSelection() {
  const selection = window.getSelection();

  if (
    selection.toString().trim().length > 0 &&
    document.getElementById("documentPreview").contains(selection.anchorNode)
  ) {
    // Store the selected text and range
    selectedText = selection.toString();
    selectionRange = selection.getRangeAt(0);

    // Get position for the edit button
    const rect = selectionRange.getBoundingClientRect();

    // Show the edit button near the selection
    showEditWithAIButton(rect);
  } else {
    // Remove the edit button if no text is selected
    const editButton = document.getElementById("edit-ai-button");
    if (editButton) {
      editButton.remove();
    }
  }
}

function showEditWithAIButton(rect) {
  // Remove any existing button
  const existingButton = document.getElementById("edit-ai-button");
  if (existingButton) {
    existingButton.remove();
  }

  // Create button element
  const editButton = document.createElement("div");
  editButton.id = "edit-ai-button";
  editButton.className = "floating-edit-button";
  editButton.innerHTML = `<button class="btn btn-edit">Edit with AI</button>`;

  // Position the button near the selection
  editButton.style.position = "absolute";
  editButton.style.left = `${rect.left + window.scrollX}px`;
  editButton.style.top = `${rect.bottom + window.scrollY + 5}px`;
  editButton.style.zIndex = "1000";

  // Add click event
  editButton.querySelector("button").addEventListener("click", openEditDialog);

  // Add to document
  document.body.appendChild(editButton);
}

function openEditDialog() {
  // Create dialog if it doesn't exist
  let dialog = document.getElementById("edit-ai-dialog");

  if (!dialog) {
    dialog = document.createElement("div");
    dialog.id = "edit-ai-dialog";
    dialog.className = "modal";
    dialog.innerHTML = `
      <div class="modal-content">
        <span class="close" onclick="closeEditDialog()">&times;</span>
        <h3>Edit with AI</h3>

        <div class="edit-dialog-body">
          <div>
            <p><strong>Selected Text:</strong></p>
            <div id="selected-text-display" class="selected-text-box"></div>
          </div>

          <div>
            <p><strong>How would you like to modify this text?</strong></p>
            <textarea id="ai-edit-prompt" class="prompt-input" placeholder="Enter your instructions for the AI..."></textarea>
          </div>
        </div>

        <div class="modal-buttons">
          <button class="btn btn-cancel" onclick="closeEditDialog()">Cancel</button>
          <button class="btn btn-edit" id="submit-ai-edit">Update Text</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);
    document
      .getElementById("submit-ai-edit")
      .addEventListener("click", submitAIEditRequest);
  }

  // Populate selected text
  document.getElementById("selected-text-display").textContent = selectedText;

  // Show the dialog
  dialog.style.display = "block";

  // Remove the floating button
  const editButton = document.getElementById("edit-ai-button");
  if (editButton) {
    editButton.remove();
  }
}

function closeEditDialog() {
  const dialog = document.getElementById("edit-ai-dialog");
  if (dialog) {
    dialog.style.display = "none";
    document.getElementById("ai-edit-prompt").value = "";
  }
}

/**
 * Get or calculate AI suggestions for a specific field
 * @param {String} path - The path to the field to update
 */
function updateValueWithAI(path) {
  const inputElement = document.querySelector(`input[data-key="${path}"]`);
  const promptElement = document.querySelector(`textarea[data-key="${path}"]`);
  const currentValue = inputElement ? inputElement.value : "";
  const customPrompt = promptElement ? promptElement.value : "";

  const aiSuggestionInput = document.querySelector(
    `input[data-ai-suggestion="${path}"]`
  );
  const saveButton = document.querySelector(
    `button.save-button[onclick="saveValue('${path}')"]`
  );

  if (!aiSuggestionInput) return;

  // Update UI to show loading state
  const aiButton = document.querySelector(
    `button.ai-button[onclick="updateValueWithAI('${path}')"]`
  );
  const originalButtonText = aiButton.textContent;
  aiButton.textContent = "Loading...";
  aiButton.disabled = true;

  // Create default prompt if none was provided
  const prompt = customPrompt || `Please improve this text: "${currentValue}"`;

  // Make API request to get AI suggestion
  fetch("/update_value", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      selectedText: currentValue,
      prompt: prompt,
      fullContent: document.getElementById("documentPreview").innerHTML,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      if (data.error) {
        throw new Error(data.error);
      }

      // Update UI with the AI suggestion
      aiSuggestionInput.value = data.value;
      saveButton.disabled = false;
    })
    .catch((error) => {
      console.error("Error getting AI suggestion:", error);
      aiSuggestionInput.value = "Error: " + error.message;
    })
    .finally(() => {
      // Reset button state
      aiButton.textContent = originalButtonText;
      aiButton.disabled = false;
    });
}

function submitAIEditRequest() {
  // Get the prompt from the textarea
  const prompt = document.getElementById("ai-edit-prompt").value;

  if (!prompt.trim()) {
    alert("Please enter instructions for the AI.");
    return;
  }

  // Get the full document content
  const fullContent = document.getElementById("documentPreview").innerHTML;

  // Update button to show loading state
  const submitButton = document.getElementById("submit-ai-edit");
  const originalText = submitButton.textContent;
  submitButton.textContent = "Processing...";
  submitButton.disabled = true;

  // Make the API request
  fetch("/update_value", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      selectedText: selectedText,
      prompt: prompt,
      fullContent: fullContent,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      if (data.error) {
        throw new Error(data.error);
      }

      // Update the document with the new text
      updateDocumentWithAIResponse(data.value);

      // Close the dialog
      closeEditDialog();
    })
    .catch((error) => {
      alert("Error: " + error.message);
    })
    .finally(() => {
      // Reset button state
      submitButton.textContent = originalText;
      submitButton.disabled = false;
    });
}

function updateDocumentWithAIResponse(newText) {
  if (!selectionRange) return;

  // Delete the original text
  selectionRange.deleteContents();

  // Insert the new text
  const textNode = document.createTextNode(newText);
  selectionRange.insertNode(textNode);

  // Clear the selection variables
  selectedText = "";
  selectionRange = null;

  // Optionally show a success message
  const successMessage = document.createElement("div");
  successMessage.className = "success";
  successMessage.textContent = "Text updated successfully";
  successMessage.style.position = "fixed";
  successMessage.style.bottom = "20px";
  successMessage.style.right = "20px";
  successMessage.style.padding = "10px 20px";
  document.body.appendChild(successMessage);

  // Remove the message after 3 seconds
  setTimeout(() => {
    successMessage.remove();
  }, 3000);
}

// Predefined questions for manufacturing agreement document
const documentQuestions = {
  step1: {
    title: "Date and Party Type",
    date: {
      question: "Enter the date of agreement",
      type: "date",
    },
    effectiveDate: {
      question: "When does this agreement become effective?",
      type: "select",
      options: ["Date of execution", "Specific date"],
    },
    effectiveDateSpecific: {
      question: "Enter specific effective date",
      type: "date",
      showIf: "effectiveDate=Specific date",
    },
  },
  step2: {
    title: "Manufacturer Details",
    manufacturerType: {
      question: "Select type of Manufacturer",
      type: "select",
      options: ["Individual", "Company", "Partnership"],
    },
    individual: {
      name: {
        question: "Enter individual's full name",
        type: "text",
        showIf: "manufacturerType=Individual",
      },
      address: {
        question: "Enter individual's address",
        type: "text",
        showIf: "manufacturerType=Individual",
      },
    },
    company: {
      name: {
        question: "Enter company name",
        type: "text",
        showIf: "manufacturerType=Company",
      },
      regNumber: {
        question: "Enter registration number",
        type: "text",
        showIf: "manufacturerType=Company",
      },
      address: {
        question: "Enter registered office address",
        type: "text",
        showIf: "manufacturerType=Company",
      },
      signatory: {
        question: "Enter name of person signing on behalf of company",
        type: "text",
        showIf: "manufacturerType=Company",
      },
    },
    partnership: {
      name: {
        question: "Enter partnership name",
        type: "text",
        showIf: "manufacturerType=Partnership",
      },
      address: {
        question: "Enter principal place of business",
        type: "text",
        showIf: "manufacturerType=Partnership",
      },
      signatory: {
        question: "Enter name of partner signing on behalf of partnership",
        type: "text",
        showIf: "manufacturerType=Partnership",
      },
    },
    executionDateManufacturer: {
      question: "Date for manufacturer signature",
      type: "date",
    },
  },
  step3: {
    title: "Customer Details",
    customerType: {
      question: "Select type of Customer",
      type: "select",
      options: ["Individual", "Company", "Partnership"],
    },
    individual: {
      name: {
        question: "Enter individual's full name",
        type: "text",
        showIf: "customerType=Individual",
      },
      address: {
        question: "Enter individual's address",
        type: "text",
        showIf: "customerType=Individual",
      },
    },
    company: {
      name: {
        question: "Enter company name",
        type: "text",
        showIf: "customerType=Company",
      },
      regNumber: {
        question: "Enter registration number",
        type: "text",
        showIf: "customerType=Company",
      },
      address: {
        question: "Enter registered office address",
        type: "text",
        showIf: "customerType=Company",
      },
      signatory: {
        question: "Enter name of person signing on behalf of company",
        type: "text",
        showIf: "customerType=Company",
      },
    },
    partnership: {
      name: {
        question: "Enter partnership name",
        type: "text",
        showIf: "customerType=Partnership",
      },
      address: {
        question: "Enter principal place of business",
        type: "text",
        showIf: "customerType=Partnership",
      },
      signatory: {
        question: "Enter name of partner signing on behalf of partnership",
        type: "text",
        showIf: "customerType=Partnership",
      },
    },
    executionDateCustomer: {
      question: "Date for customer signature",
      type: "date",
    },
  },
  step4: {
    title: "Agreement Details",
    territory: {
      question: "Enter the territory of operation",
      type: "text",
    },
    productDefinitionOption: {
      question: "How would you like to define the products?",
      type: "select",
      options: [
        "Specific identified products",
        "Any products supplied by manufacturer",
        "Products in Schedule 1",
      ],
    },
    products: {
      question: "Describe the products to be manufactured",
      type: "textarea",
      showIf: "productDefinitionOption=Specific identified products",
    },
    minQuantity: {
      question: "Enter the minimum quantity requirements",
      type: "text",
    },
    term: {
      question: "Enter the term of the agreement",
      type: "text",
    },
    termType: {
      question: "Select the term type",
      type: "select",
      options: ["Indefinite", "Fixed Date", "Fixed Event"],
    },
    termDate: {
      question: "Enter the end date for a fixed term",
      type: "date",
      showIf: "termType=Fixed Date",
    },
    termEvent: {
      question: "Describe the event that will end the term",
      type: "text",
      showIf: "termType=Fixed Event",
    },
    minimumTermDuration: {
      question: "Minimum term duration (in months)",
      type: "select",
      options: ["3", "6", "12", "24", "36"],
    },
  },
  step5: {
    title: "Product Specifications & Quality",
    specificationLevel: {
      question: "Level of product specification detail",
      type: "select",
      options: ["Basic", "Detailed", "Comprehensive"],
    },
    qualityStandards: {
      question: "Quality standards to be met (e.g., ISO 9001)",
      type: "text",
    },
    testingProcedures: {
      question: "Testing procedures required",
      type: "textarea",
    },
    packagingRequirements: {
      question: "Product packaging specifications",
      type: "textarea",
    },
    materialRequirements: {
      question: "Specific material requirements or restrictions",
      type: "textarea",
    },
    specificationResponsibility: {
      question: "Who is responsible for providing specifications?",
      type: "select",
      options: ["Customer", "Manufacturer", "Shared responsibility"],
    },
    specificationTimingOption: {
      question: "When must specifications be provided?",
      type: "select",
      options: [
        "Promptly after order",
        "Before manufacturing begins",
        "Custom timing",
      ],
    },
    specificationCustomTiming: {
      question: "Specify custom timing for specifications",
      type: "text",
      showIf: "specificationTimingOption=Custom timing",
    },
  },
  step6: {
    title: "Delivery and Logistics",
    deliveryTerms: {
      question: "Delivery terms",
      type: "select",
      options: [
        "Ex Works (EXW)",
        "Free on Board (FOB)",
        "Cost, Insurance & Freight (CIF)",
        "Delivered Duty Paid (DDP)",
        "Other",
      ],
    },
    shippingResponsibility: {
      question: "Who arranges shipping?",
      type: "select",
      options: ["Manufacturer", "Customer", "Third party"],
    },
    deliverySchedule: {
      question: "Delivery schedule preference",
      type: "select",
      options: [
        "Regular scheduled deliveries",
        "On-demand deliveries",
        "Just-in-time deliveries",
      ],
    },
    storageArrangements: {
      question: "Storage arrangements for manufactured products",
      type: "textarea",
    },
    riskPassingPoint: {
      question: "When does risk pass to the customer?",
      type: "select",
      options: ["Ex works", "On delivery", "On acceptance", "Custom"],
    },
    customRiskPassingPoint: {
      question: "Specify custom risk passing point",
      type: "text",
      showIf: "riskPassingPoint=Custom",
    },
  },
  step7: {
    title: "Forecasting & Orders",
    forecastDateOption: {
      question: "Forecast date frequency",
      type: "select",
      options: [
        "1st day of each month",
        "15th day of each month",
        "Last day of each month",
        "Custom date",
      ],
    },
    customForecastDate: {
      question: "Specify custom forecast date",
      type: "text",
      showIf: "forecastDateOption=Custom date",
    },
    forecastPeriod: {
      question: "Forecast period length (in months)",
      type: "select",
      options: ["3", "6", "9", "12"],
    },
    forecastBinding: {
      question: "Are forecasts binding?",
      type: "select",
      options: ["Yes", "No"],
    },
    orderResponseTime: {
      question: "Manufacturer response time to orders (in business days)",
      type: "select",
      options: ["1", "2", "3", "5", "7", "10"],
    },
  },
  step8: {
    title: "Payment Details",
    paymentTerms: {
      question: "Payment terms",
      type: "select",
      options: [
        "Advance payment",
        "Upon delivery",
        "Net 30 days",
        "Net 60 days",
        "Net 90 days",
        "Custom",
      ],
    },
    customPaymentTerms: {
      question: "Specify custom payment terms",
      type: "textarea",
      showIf: "paymentTerms=Custom",
    },
    currency: {
      question: "Currency for payments",
      type: "text",
    },
    paymentMethod: {
      question: "Payment method",
      type: "select",
      options: [
        "Wire transfer",
        "Letter of credit",
        "Check",
        "Credit card",
        "Other",
      ],
    },
    latePaymentInterest: {
      question: "Late payment interest rate (% per annum)",
      type: "text",
    },
    invoicingTiming: {
      question: "When should invoices be issued?",
      type: "select",
      options: ["Promptly", "At any time", "Within 7 days", "Specific timing"],
    },
    invoiceSpecificTiming: {
      question: "Specify invoice timing",
      type: "text",
      showIf: "invoicingTiming=Specific timing",
    },
    paymentTiming: {
      question: "When should payment be due?",
      type: "select",
      options: [
        "Upon issue of invoice",
        "Upon receipt of invoice",
        "Within specified days",
      ],
    },
    paymentDays: {
      question: "Number of days for payment",
      type: "select",
      options: ["7", "14", "30", "60", "90"],
      showIf: "paymentTiming=Within specified days",
    },
    valueAddedTax: {
      question: "How are value added taxes handled?",
      type: "select",
      options: ["Inclusive in stated amounts", "Added to stated amounts"],
    },
  },
  step9: {
    title: "Intellectual Property & Confidentiality",
    designOwnership: {
      question: "Who owns the product designs and specifications?",
      type: "select",
      options: ["Manufacturer", "Customer", "Shared ownership", "Third party"],
    },
    confidentialityPeriod: {
      question: "Confidentiality period (in years) after termination",
      type: "select",
      options: ["1 year", "2 years", "3 years", "5 years", "Indefinite"],
    },
    ipRestrictions: {
      question: "Restrictions on use of intellectual property",
      type: "textarea",
    },
    improvementsOwnership: {
      question: "Who owns improvements made during manufacturing?",
      type: "select",
      options: ["Manufacturer", "Customer", "Shared ownership"],
    },
    exclusivityOption: {
      question: "Manufacturing exclusivity arrangement",
      type: "select",
      options: ["Exclusive", "Non-exclusive"],
    },
    exclusivityDuration: {
      question: "Post-termination exclusivity period (months)",
      type: "select",
      options: ["0", "6", "12", "24"],
      showIf: "exclusivityOption=Exclusive",
    },
    territoryExclusivity: {
      question: "Is exclusivity limited to specific territory?",
      type: "select",
      options: ["Yes", "No"],
      showIf: "exclusivityOption=Exclusive",
    },
    confidentialityDuration: {
      question: "How long should confidentiality obligations last?",
      type: "select",
      options: ["Indefinitely", "Fixed period"],
    },
    confidentialityDisclosureConditions: {
      question: "Conditions for disclosing confidential information",
      type: "select",
      options: [
        "With written consent only",
        "Under conditions of confidentiality",
      ],
    },
  },
  step10: {
    title: "Warranty & Quality Control",
    warrantyPeriod: {
      question: "Warranty period (in months)",
      type: "text",
    },
    inspectionRights: {
      question: "Customer inspection rights",
      type: "select",
      options: [
        "No inspection",
        "Pre-shipment inspection",
        "Random batch inspection",
        "100% inspection",
      ],
    },
    defectiveRate: {
      question: "Maximum acceptable defective rate (%)",
      type: "text",
    },
    remedyPreference: {
      question: "Preferred remedy for defective products",
      type: "select",
      options: [
        "Replacement",
        "Repair",
        "Refund",
        "Credit toward future orders",
      ],
    },
    returnProcess: {
      question: "Return merchandise authorization process",
      type: "textarea",
    },
    indemnityReporting: {
      question: "Indemnity requirements",
      type: "select",
      options: [
        "Indemnity without compliance requirements",
        "Indemnity conditional on compliance with requirements",
      ],
    },
  },
  step11: {
    title: "Termination & Dispute Resolution",
    terminationNotice: {
      question: "Minimum notice period for termination (in days)",
      type: "text",
    },
    disputeResolution: {
      question: "Preferred dispute resolution method",
      type: "select",
      options: ["Direct negotiation", "Mediation", "Arbitration", "Litigation"],
    },
    governingLaw: {
      question: "Governing law jurisdiction",
      type: "text",
    },
    specialTerminationRights: {
      question: "Special termination conditions",
      type: "textarea",
    },
    postTerminationObligations: {
      question: "Post-termination obligations",
      type: "textarea",
    },
    terminationRightsOption: {
      question: "Who can initiate termination?",
      type: "select",
      options: ["Both parties equally", "Manufacturer only", "Customer only"],
    },
    terminationRightsScope: {
      question: "Termination rights scope",
      type: "select",
      options: [
        "Limited to agreement provisions",
        "Includes additional legal rights",
      ],
    },
    breachType: {
      question: "What type of breach allows termination?",
      type: "select",
      options: ["Any breach", "Material breach only"],
    },
    remedyPeriod: {
      question: "Period to remedy breach before termination (in days)",
      type: "select",
      options: ["7", "14", "30", "60", "90"],
    },
    forceMainDuration: {
      question:
        "How long can force majeure continue before termination rights (in days)?",
      type: "text",
    },
  },
};

// Updated documentPathMap for Manufacturing Agreement
// --- Updated documentPathMap for Manufacturing Agreement ---
const documentPathMap = {
  // Date field
  "date": ["Manufacturing Agreement.DATE.content"],
  
  // Manufacturer (Party 1) fields
  "manufacturerType": ["Manufacturing Agreement.PARTIES.1.content"],
  "manufacturer_individual_name": [
    "Manufacturing Agreement.PARTIES.1.content",
    "Manufacturing Agreement.EXECUTION.signature_blocks.manufacturer"
  ],
  "manufacturer_individual_address": ["Manufacturing Agreement.PARTIES.1.content"],
  "manufacturer_company_name": [
    "Manufacturing Agreement.PARTIES.1.content",
    "Manufacturing Agreement.EXECUTION.signature_blocks.manufacturer"
  ],
  "manufacturer_company_regNumber": ["Manufacturing Agreement.PARTIES.1.content"],
  "manufacturer_company_address": ["Manufacturing Agreement.PARTIES.1.content"],
  "manufacturer_company_signatory": ["Manufacturing Agreement.EXECUTION.signature_blocks.manufacturer"],
  "manufacturer_partnership_name": [
    "Manufacturing Agreement.PARTIES.1.content",
    "Manufacturing Agreement.EXECUTION.signature_blocks.manufacturer"
  ],
  "manufacturer_partnership_address": ["Manufacturing Agreement.PARTIES.1.content"],
  "manufacturer_partnership_signatory": ["Manufacturing Agreement.EXECUTION.signature_blocks.manufacturer"],
  
  // Customer (Party 2) fields
  "customerType": ["Manufacturing Agreement.PARTIES.2.content"],
  "customer_individual_name": [
    "Manufacturing Agreement.PARTIES.2.content",
    "Manufacturing Agreement.EXECUTION.signature_blocks.customer"
  ],
  "customer_individual_address": ["Manufacturing Agreement.PARTIES.2.content"],
  "customer_company_name": [
    "Manufacturing Agreement.PARTIES.2.content",
    "Manufacturing Agreement.EXECUTION.signature_blocks.customer"
  ],
  "customer_company_regNumber": ["Manufacturing Agreement.PARTIES.2.content"],
  "customer_company_address": ["Manufacturing Agreement.PARTIES.2.content"],
  "customer_company_signatory": ["Manufacturing Agreement.EXECUTION.signature_blocks.customer"],
  "customer_partnership_name": [
    "Manufacturing Agreement.PARTIES.2.content",
    "Manufacturing Agreement.EXECUTION.signature_blocks.customer"
  ],
  "customer_partnership_address": ["Manufacturing Agreement.PARTIES.2.content"],
  "customer_partnership_signatory": ["Manufacturing Agreement.EXECUTION.signature_blocks.customer"],
  // Additional mappings for other fields can be added as needed
};

// --- Highlighting Functions (unchanged from your original code) ---
function highlightDocumentSection(fieldId) {
  // Clear any existing highlights first
  clearHighlights();

  // Get the paths this field affects
  const paths = documentPathMap[fieldId];
  if (!paths || paths.length === 0) return;

  const previewElem = document.getElementById("documentPreview");
  paths.forEach(path => {
    // Try to find elements with this exact data-value-path
    const elements = previewElem.querySelectorAll(`[data-value-path="${path}"]`);
    if (elements.length === 0) {
      // If not found, try the parent element using data-path (strip off last segment)
      const basePathParts = path.split('.');
      basePathParts.pop();
      const basePath = basePathParts.join('.');
      const parentElements = previewElem.querySelectorAll(`[data-path="${basePath}"]`);
      parentElements.forEach(elem => {
        elem.classList.add("highlighted-section");
      });
    } else {
      elements.forEach(elem => {
        elem.classList.add("highlighted");
      });
    }
  });

  // Scroll to the first highlighted element
  setTimeout(() => {
    const firstHighlighted = document.querySelector(".highlighted, .highlighted-section");
    if (firstHighlighted) {
      firstHighlighted.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 1);
}

function clearHighlights() {
  const previewElem = document.getElementById("documentPreview");
  const highlightedElements = previewElem.querySelectorAll(".highlighted, .highlighted-section");
  highlightedElements.forEach(element => {
    element.classList.remove("highlighted");
    element.classList.remove("highlighted-section");
  });
}

// --- Register Highlight Events on Input Fields ---
function registerHighlightEvents() {
  document.querySelectorAll("#keyContainer input, #keyContainer select, #keyContainer textarea").forEach(input => {
    // When an input field gains focus or changes, highlight the corresponding document section.
    input.addEventListener("focus", function() {
      highlightDocumentSection(this.id);
    });
    input.addEventListener("input", function() {
      highlightDocumentSection(this.id);
    });
    // Clear highlights when the field loses focus (unless another relevant field is active)
    input.addEventListener("blur", function() {
      setTimeout(() => {
        if (!document.activeElement || !document.activeElement.hasAttribute("data-affects-path")) {
          clearHighlights();
        }
      }, 100);
    });
  });
}

// --- Ensure Highlighting Events Are Registered on DOM Content Loaded ---
document.addEventListener("DOMContentLoaded", async function () {
  console.log("Document initialization started");
  if (!window.currentDocument) {
    console.error("No document found in window.currentDocument");
    window.currentDocument = { "Manufacturing Agreement": {} };
  }

  try {
    // Initialize the document template
    initializeDocumentTemplate();

    showQuestionnaire();
    updatePreview();

    // Register highlighting events after the questionnaire is rendered
    setTimeout(registerHighlightEvents, 500);

    // Initialize AI editing functionality
    const previewElem = document.getElementById("documentPreview");
    if (previewElem) {
      previewElem.addEventListener("mouseup", handleTextSelection);
      previewElem.addEventListener("keyup", handleTextSelection);
    }

    console.log("Document initialization completed");
  } catch (error) {
    console.error("Error during initialization:", error);
  }
});

// Store form data between steps
let formDataStore = {};

document.addEventListener("DOMContentLoaded", async function () {
  console.log("Document initialization started");
  if (!window.currentDocument) {
    console.error("No document found in window.currentDocument");
    window.currentDocument = { "Manufacturing Agreement": {} };
  }

  try {
    // Initialize the document template
    initializeDocumentTemplate();

    showQuestionnaire();
    // Then initialize the preview
    updatePreview();

    // Initialize AI editing functionality
    const previewElem = document.getElementById("documentPreview");
    if (previewElem) {
      previewElem.addEventListener("mouseup", handleTextSelection);
      previewElem.addEventListener("keyup", handleTextSelection);
    }

    console.log("Document initialization completed");
  } catch (error) {
    console.error("Error during initialization:", error);
  }
});

// Convert document object to HTML for preview
function convertToHtml(document) {
  let html = [];
  const documentTitle = Object.keys(document)[0];
  if (documentTitle) {
    html.push(
      `<div class="document-title"><strong>${documentTitle}</strong></div>`
    );
    const mainContent = document[documentTitle];
    sectionOrder.forEach((section) => {
      if (mainContent[section]) {
        processSection(section, mainContent[section], 0, documentTitle);
      }
    });
  }
  return html.join("");

  function processSection(key, value, level, path) {
    const currentPath = path ? `${path}.${key}` : key;
    const isMainSection = sectionOrder.includes(key);
    const marginLeft = level * 20;
    const sectionClass = isMainSection ? "main-section" : "sub-section";

    if (isMainSection) {
      html.push(
        `<div class="document-line ${sectionClass}" data-path="${currentPath}" style="margin-left: ${marginLeft}px;">
                    <h5><strong>${key}</strong></h5>
                </div>`
      );
    } else {
      html.push(
        `<div class="document-line ${sectionClass}" data-path="${currentPath}" style="margin-left: ${
          marginLeft + 20
        }px;">
                    <h6><strong>${key}</strong></h6>
                </div>`
      );
    }

    if (typeof value === "object" && value !== null) {
      let keys = Object.keys(value);
      if (key === "AGREEMENT") {
        const actualKeys = Object.keys(value);
        keys = agreementSectionOrder
          .filter((k) => actualKeys.includes(k))
          .concat(actualKeys.filter((k) => !agreementSectionOrder.includes(k)));
      }

      keys.forEach((subKey) => {
        const subValue = value[subKey];
        const subMarginLeft = marginLeft + 40;

        if (subValue && typeof subValue === "object") {
          if (subValue.content !== undefined) {
            html.push(
              `<div class="document-line document-content" data-path="${currentPath}.${subKey}.content" style="margin-left: ${subMarginLeft}px;">
                                <span data-value-path="${currentPath}.${subKey}.content">
                                    <strong>${subKey}:</strong> ${subValue.content}
                                </span>
                            </div>`
            );
          } else {
            processSection(subKey, subValue, level + 1, currentPath);
          }
        } else {
          html.push(
            `<div class="document-line document-content" data-path="${currentPath}.${subKey}" style="margin-left: ${subMarginLeft}px;">
                            <span>
                                <strong>${subKey}:</strong>
                                <span data-value-path="${currentPath}.${subKey}">${subValue}</span>
                            </span>
                        </div>`
          );
        }
      });
    }
  }
}

// Save selection for inserted content
let savedRange = null;
const previewElem = document.getElementById("documentPreview");
if (previewElem) {
  previewElem.addEventListener("mouseup", saveSelection);
  previewElem.addEventListener("keyup", saveSelection);
}

function saveSelection() {
  const sel = window.getSelection();
  if (sel.rangeCount > 0) savedRange = sel.getRangeAt(0);
}

function showQuestionnaire() {
  // Get the right panel container
  const container = document.getElementById("keyContainer");

  // Update the panel heading
  const panelHeading = container.parentElement.querySelector("h2");
  if (panelHeading) {
    panelHeading.innerHTML =
      'Document Information <button class="btn btn-add" onclick="submitQuestionnaire()">Save Document</button>';
  }

  // Clear existing content
  container.innerHTML = "";

  // Create all steps at once in the container
  let allQuestionsHTML = "";
  for (let stepNumber = 1; stepNumber <= 10; stepNumber++) {
    const stepData = documentQuestions[`step${stepNumber}`];
    allQuestionsHTML += `
      <div class="questionnaire-section">
        <h3>${stepData.title}</h3>
        <div class="step-content">
          ${createQuestionsHTML(stepData)}
        </div>
      </div>
    `;
  }

  // Add to container
  container.innerHTML = allQuestionsHTML;

  // Add change handlers for real-time updates
  document
    .querySelectorAll(
      "#keyContainer input, #keyContainer select, #keyContainer textarea"
    )
    .forEach((input) => {
      input.addEventListener("input", function () {
        // Store the value with its unique ID
        formDataStore[this.id] = this.value;

        // For party type dropdowns, handle specially
        if (this.id === "manufacturerType" || this.id === "customerType") {
          handlePartyTypeChange(this);
        } else if (this.tagName === "SELECT") {
          handleFieldChange(this);
        } else {
          // Update document in real-time for other inputs
          updateDocumentWithFormData(formDataStore);
          updatePreview();
        }
      });
    });

  // Restore all saved form data
  for (let step = 1; step <= 10; step++) {
    restoreStepData(step);
  }
}

function createQuestionsHTML(stepData) {
  let html = "";

  // Add section identifier classes
  const isManufacturerSection =
    stepData.title && stepData.title.includes("Manufacturer");
  const isCustomerSection =
    stepData.title && stepData.title.includes("Customer");
  const sectionClass = isManufacturerSection
    ? "manufacturer-section"
    : isCustomerSection
    ? "customer-section"
    : "";

  for (const [key, data] of Object.entries(stepData)) {
    if (key === "title") continue;

    if (typeof data === "object" && !data.type) {
      // This is a group of questions - add section class
      const groupClass = isManufacturerSection
        ? "manufacturer-group"
        : isCustomerSection
        ? "customer-group"
        : "";

      html += `<div class="question-group ${groupClass}" id="${key}-group">`;
      html += createQuestionsHTML(data);
      html += "</div>";
    } else {
      // This is a single question
      html += createQuestionField(key, data, sectionClass);
    }
  }
  return html;
}

function createQuestionField(key, data, sectionClass = "") {
  if (!data.question) return ""; // Skip if no question

  let visibilityAttr = "";
  if (data.showIf) {
    const [condition, value] = data.showIf.split("=");
    visibilityAttr = `data-show-if="${condition}" data-show-value="${value}" style="display: none;"`;
  }

  return `
    <div class="question-field ${sectionClass}" ${visibilityAttr}>
      <label>${data.question}</label>
      ${createInputElement(key, data)}
    </div>
  `;
}

function createInputElement(key, data) {
  // Determine which section and type we're in
  let prefix = "";

  // Extract context from showIf
  const dataShowIf = data.showIf || "";
  if (dataShowIf.includes("manufacturerType=")) {
    const type = dataShowIf.split("=")[1].toLowerCase();
    prefix = `manufacturer_${type}_`;
  } else if (dataShowIf.includes("customerType=")) {
    const type = dataShowIf.split("=")[1].toLowerCase();
    prefix = `customer_${type}_`;
  } else if (key === "manufacturerType" || key === "customerType") {
    // No prefix for the type selectors themselves
    prefix = "";
  }

  // Create full ID
  const fullId = prefix ? prefix + key : key;

  // Handle special cases for the type selectors themselves
  if (key === "manufacturerType" || key === "customerType") {
    return `
      <select id="${key}" onchange="handlePartyTypeChange(this)">
        <option value="">Select...</option>
        ${data.options
          .map((opt) => `<option value="${opt}">${opt}</option>`)
          .join("")}
      </select>
    `;
  }

  // Create the appropriate input element
  switch (data.type) {
    case "textarea":
      return `<textarea id="${fullId}" class="form-textarea" data-original-key="${key}"></textarea>`;
    case "date":
      return `<input type="date" id="${fullId}" data-original-key="${key}">`;
    case "select":
      return `
        <select id="${fullId}" data-original-key="${key}">
          <option value="">Select...</option>
          ${data.options
            .map((opt) => `<option value="${opt}">${opt}</option>`)
            .join("")}
        </select>
      `;
    default:
      return `<input type="text" id="${fullId}" data-original-key="${key}">`;
  }
}

function handleFieldChange(element) {
  // Save the value
  formDataStore[element.id] = element.value;

  // Handle conditional fields
  const condition = element.id;
  const value = element.value;

  document
    .querySelectorAll(`[data-show-if="${condition}"]`)
    .forEach((field) => {
      field.style.display =
        field.dataset.showValue === value ? "block" : "none";
    });

  // Update document based on new field value
  updateDocumentWithFormData(formDataStore);
  updatePreview();
}

function navigateStep(stepNumber) {
  // Save current step data
  const currentStep = getCurrentStep();
  saveStepData(currentStep);

  // Update UI to show the requested step
  document
    .querySelectorAll(".questionnaire-section")
    .forEach((section, index) => {
      if (index + 1 === stepNumber) {
        section.style.display = "block";
      } else {
        section.style.display = "none";
      }
    });

  // Update step indicator if it exists
  const stepIndicators = document.querySelectorAll(".step-indicator .step-dot");
  if (stepIndicators.length > 0) {
    stepIndicators.forEach((dot, index) => {
      if (index + 1 === stepNumber) {
        dot.classList.add("active");
      } else {
        dot.classList.remove("active");
        // Mark previous steps as completed
        if (index + 1 < stepNumber) {
          dot.classList.add("completed");
        } else {
          dot.classList.remove("completed");
        }
      }
    });
  }

  // Update navigation buttons
  const prevButton = document.querySelector(".prev-step-button");
  const nextButton = document.querySelector(".next-step-button");
  const submitButton = document.querySelector(".submit-button");

  if (prevButton) {
    prevButton.style.display = stepNumber > 1 ? "inline-block" : "none";
  }

  if (nextButton) {
    nextButton.style.display = stepNumber < 11 ? "inline-block" : "none";
  }

  if (submitButton) {
    submitButton.style.display = stepNumber === 11 ? "inline-block" : "none";
  }

  // Scroll to top of form
  document
    .querySelector(".questionnaire-section")
    .scrollIntoView({ behavior: "smooth" });
}

function restoreStepData(stepNumber) {
  // Restore all saved values for this step
  const stepContainer = document.querySelectorAll(".questionnaire-section")[
    stepNumber - 1
  ];
  if (!stepContainer) return;

  // Restore basic inputs
  stepContainer.querySelectorAll("input, select, textarea").forEach((input) => {
    if (input.id && formDataStore[input.id] !== undefined) {
      input.value = formDataStore[input.id];

      // Handle visibility for conditional fields based on select values
      if (input.tagName === "SELECT") {
        if (input.id === "manufacturerType" || input.id === "customerType") {
          handlePartyTypeChange(input);
        } else {
          handleFieldChange(input);
        }
      }
    }
  });

  // Handle option-dependent fields - those with data-show-if attributes
  stepContainer.querySelectorAll("[data-show-if]").forEach((field) => {
    const condition = field.getAttribute("data-show-if");
    const [controlId, requiredValue] = condition.split("=");

    // Find the controlling element value
    const controlValue = formDataStore[controlId];

    // Set visibility based on the condition
    if (controlValue === requiredValue) {
      field.style.display = "block";
    } else {
      field.style.display = "none";
    }
  });

  // Handle any special interdependent options
  if (stepNumber === 9) {
    // Intellectual Property & Confidentiality step
    const exclusivityOption = formDataStore.exclusivityOption;
    if (exclusivityOption) {
      document
        .querySelectorAll('[data-depends-on="exclusivityOption"]')
        .forEach((field) => {
          field.style.display =
            field.dataset.dependValue === exclusivityOption ? "block" : "none";
        });
    }
  }

  if (stepNumber === 8) {
    // Payment Details step
    const paymentTiming = formDataStore.paymentTiming;
    if (paymentTiming) {
      document
        .querySelectorAll(
          '[data-show-if="paymentTiming=Within specified days"]'
        )
        .forEach((field) => {
          field.style.display =
            paymentTiming === "Within specified days" ? "block" : "none";
        });
    }
  }
}

function submitQuestionnaire() {
  try {
    // Validate required fields
    const requiredFields = document.querySelectorAll("[data-required='true']");
    let isValid = true;
    let firstInvalidField = null;

    requiredFields.forEach((field) => {
      // Only validate fields that are currently visible
      if (field.offsetParent !== null && !field.value) {
        field.classList.add("error-field");
        if (!firstInvalidField) firstInvalidField = field;
        isValid = false;
      } else {
        field.classList.remove("error-field");
      }
    });

    if (!isValid) {
      alert("Please fill in all required fields before submitting.");
      if (firstInvalidField) firstInvalidField.focus();
      return;
    }

    // Update document with all collected data
    updateDocumentWithFormData(formDataStore);

    // Update UI
    updatePreview();

    // Show success message
    const successMessage = document.createElement("div");
    successMessage.className = "success";
    successMessage.textContent = "Document information saved successfully!";
    successMessage.style.position = "fixed";
    successMessage.style.bottom = "20px";
    successMessage.style.right = "20px";
    successMessage.style.padding = "10px 20px";
    document.body.appendChild(successMessage);

    // Remove message after 3 seconds
    setTimeout(() => {
      successMessage.remove();
    }, 3000);

    // Optionally scroll to preview section
    document
      .getElementById("documentPreview")
      .scrollIntoView({ behavior: "smooth" });

    // Optional: Save form data to localStorage for persistence
    try {
      localStorage.setItem(
        "manufacturingFormData",
        JSON.stringify(formDataStore)
      );
    } catch (storageError) {
      console.warn("Could not save form data to localStorage:", storageError);
    }
  } catch (error) {
    console.error("Error submitting questionnaire:", error);
    alert("There was an error saving the document. Please try again.");
  }
}

function formatDate(dateStr) {
  // Assume dateStr is in format yyyy-mm-dd
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  return `${day}-${month}-${year}`;
}

function handlePartyTypeChange(selectElement) {
  const isManufacturer = selectElement.id === "manufacturerType";
  const isCustomer = selectElement.id === "customerType";
  const selectedType = selectElement.value;

  if (!selectedType) return;

  // Clear previous values for other types from formDataStore
  const prefix = isManufacturer ? "manufacturer_" : "customer_";
  const allPartyTypes = ["individual", "company", "partnership"];

  // Remove form data for other party types
  Object.keys(formDataStore).forEach((key) => {
    if (key.startsWith(prefix)) {
      const keyWithoutPrefix = key.substring(prefix.length);
      const matchesOtherType = allPartyTypes
        .filter((type) => type !== selectedType.toLowerCase())
        .some((type) => keyWithoutPrefix.startsWith(type));

      if (matchesOtherType) {
        delete formDataStore[key];
      }
    }
  });

  // Save the selected type
  formDataStore[selectElement.id] = selectedType;

  // Handle UI field visibility
  document
    .querySelectorAll(`[data-show-if="${selectElement.id}"]`)
    .forEach((field) => {
      const showValue = field.getAttribute("data-show-value");
      field.style.display = showValue === selectedType ? "block" : "none";
    });

  // Update document with the current form data
  updateDocumentWithFormData(formDataStore);
  updatePreview();
}

/**
 * Maps form data to document structure
 * @param {Object} flatDoc - Flattened document object
 * @param {Object} formData - The form data
 * @return {Object} Updated flat document
 */

function applyFormDataToFlatDocument(flatDoc, formData) {
  const updatedFlatDoc = { ...flatDoc };
  const documentTitle =
    Object.keys(window.currentDocument)[0] || "Manufacturing Agreement";

  // Format date if provided
  if (formData.date) {
    const formattedDate = formatDate(formData.date);
    const dateKey = `${documentTitle}.DATE.content`;
    updatedFlatDoc[dateKey] = formattedDate;
  }

  // Update Manufacturer information (Party 1)
  if (formData.manufacturerType) {
    const party1Key = `${documentTitle}.PARTIES.1.content`;
    let party1Content = "";

    if (formData.manufacturerType === "Individual") {
      const name =
        formData.manufacturer_individual_name || "*[INDIVIDUAL NAME]*";
      const address = formData.manufacturer_individual_address || "*[address]*";
      party1Content = `${name} of ${address}`;
    } else if (formData.manufacturerType === "Company") {
      const name = formData.manufacturer_company_name || "*[COMPANY NAME]*";
      const regNumber =
        formData.manufacturer_company_regNumber || "*[registration number]*";
      const address = formData.manufacturer_company_address || "*[address]*";
      party1Content = `${name}, a company incorporated in England and Wales (registration number ${regNumber}) having its registered office at ${address}`;
    } else if (formData.manufacturerType === "Partnership") {
      const name =
        formData.manufacturer_partnership_name || "*[PARTNERSHIP NAME]*";
      const address =
        formData.manufacturer_partnership_address || "*[address]*";
      party1Content = `${name}, a partnership established under the laws of England and Wales having its principal place of business at ${address}`;
    }

    if (party1Content) {
      updatedFlatDoc[party1Key] = party1Content + ' (the "Manufacturer")';
    }
  }

  // Update Customer information (Party 2)
  if (formData.customerType) {
    const party2Key = `${documentTitle}.PARTIES.2.content`;
    let party2Content = "";

    if (formData.customerType === "Individual") {
      const name = formData.customer_individual_name || "*[INDIVIDUAL NAME]*";
      const address = formData.customer_individual_address || "*[address]*";
      party2Content = `${name} of ${address}`;
    } else if (formData.customerType === "Company") {
      const name = formData.customer_company_name || "*[COMPANY NAME]*";
      const regNumber =
        formData.customer_company_regNumber || "*[registration number]*";
      const address = formData.customer_company_address || "*[address]*";
      party2Content = `${name}, a company incorporated in England and Wales (registration number ${regNumber}) having its registered office at ${address}`;
    } else if (formData.customerType === "Partnership") {
      const name = formData.customer_partnership_name || "*[PARTNERSHIP NAME]*";
      const address = formData.customer_partnership_address || "*[address]*";
      party2Content = `${name}, a partnership established under the laws of England and Wales having its principal place of business at ${address}`;
    }

    if (party2Content) {
      updatedFlatDoc[party2Key] = party2Content + ' (the "Customer")';
    }
  }

  // Update Agreement Details - Territory
  if (formData.territory) {
    const territoryKey = `${documentTitle}.AGREEMENT.1. Definitions.1.1.Territory`;
    updatedFlatDoc[territoryKey] = formData.territory;
  }

  // Update Products definition based on selection
  if (formData.productDefinitionOption) {
    const productsKey = `${documentTitle}.AGREEMENT.1. Definitions.1.1.Products`;

    if (formData.productDefinitionOption === "Specific identified products") {
      updatedFlatDoc[productsKey] =
        formData.products || "*[identify products]*";
    } else if (
      formData.productDefinitionOption ===
      "Any products supplied by manufacturer"
    ) {
      updatedFlatDoc[productsKey] =
        "[any products that the Manufacturer supplies or agrees in writing to supply to the Customer from time to time]";
    } else if (formData.productDefinitionOption === "Products in Schedule 1") {
      updatedFlatDoc[productsKey] =
        "[those products identified in Paragraph 1 of Schedule 1 (Manufacturing particulars)]";

      // Also update Schedule 1 if products are specified
      if (formData.products) {
        const scheduleKey = `${documentTitle}.SCHEDULE 1.MANUFACTURING PARTICULARS.1. Products and Product Specification.content`;
        updatedFlatDoc[scheduleKey] = formData.products;
      }
    }
  } else if (formData.products) {
    // Fallback if no option selected but products defined
    const productsKey = `${documentTitle}.AGREEMENT.1. Definitions.1.1.Products`;
    updatedFlatDoc[productsKey] = formData.products;
  }

  // Update Minimum Quantity
  if (formData.minQuantity) {
    const minQuantityKey = `${documentTitle}.AGREEMENT.1. Definitions.1.1.Minimum Quantity`;
    updatedFlatDoc[
      minQuantityKey
    ] = `means the minimum amount or amounts of Products that the Customer must order and the Manufacturer must supply under this Agreement, such amount or amounts being ${formData.minQuantity}`;

    // Also update Schedule 1
    const scheduleMinQuantityKey = `${documentTitle}.SCHEDULE 1.MANUFACTURING PARTICULARS.2. Minimum Quantity.content`;
    updatedFlatDoc[scheduleMinQuantityKey] = formData.minQuantity;
  }

  // Update Effective Date
  if (formData.effectiveDate) {
    const effectiveDateKey = `${documentTitle}.AGREEMENT.1. Definitions.1.1.Effective Date`;
    if (formData.effectiveDate === "Date of execution") {
      updatedFlatDoc[effectiveDateKey] =
        "[the date of execution of this Agreement]";
    } else if (
      formData.effectiveDate === "Specific date" &&
      formData.effectiveDateSpecific
    ) {
      const formattedDate = formatDate(formData.effectiveDateSpecific);
      updatedFlatDoc[effectiveDateKey] = `[${formattedDate}]`;
    }
  }

  // Update Term details based on the selected term type
  if (formData.termType) {
    const termKey = `${documentTitle}.AGREEMENT.3. Term.3.2.content`;
    let termContent = "This Agreement shall continue in force ";

    if (formData.termType === "Indefinite") {
      termContent += "[indefinitely]";
    } else if (formData.termType === "Fixed Date" && formData.termDate) {
      const formattedDate = formatDate(formData.termDate);
      termContent += `[until ${formattedDate}, at the beginning of which this Agreement shall terminate automatically]`;
    } else if (formData.termType === "Fixed Event" && formData.termEvent) {
      termContent += `[until ${formData.termEvent}, upon which this Agreement shall terminate automatically]`;
    } else {
      termContent += "[indefinitely]";
    }

    termContent +=
      ", subject to termination in accordance with Clause 19 or any other provision of this Agreement.";
    updatedFlatDoc[termKey] = termContent;
  }

  // Update Minimum Term if specified
  if (formData.minimumTermDuration) {
    const minTermKey = `${documentTitle}.AGREEMENT.1. Definitions.1.1.Minimum Term`;
    updatedFlatDoc[
      minTermKey
    ] = `[, in respect of this Agreement, the period of ${formData.minimumTermDuration} months beginning on the Effective Date]`;
  }

  // Update background information
  updateBackgroundInformation(updatedFlatDoc, formData, documentTitle);

  // Update Execution blocks with signature dates if provided
  updateExecutionBlocks(updatedFlatDoc, formData, documentTitle);

  // Update Forecasting section
  updateForecastingSection(updatedFlatDoc, formData, documentTitle);

  // Update Payment terms
  updatePaymentTerms(updatedFlatDoc, formData, documentTitle);

  // Update IP and Confidentiality
  updateIPAndConfidentiality(updatedFlatDoc, formData, documentTitle);

  // Update Exclusivity settings
  updateExclusivitySection(updatedFlatDoc, formData, documentTitle);

  // Update Quality and Warranty
  updateQualityAndWarranty(updatedFlatDoc, formData, documentTitle);

  // Update Termination settings
  updateTerminationSettings(updatedFlatDoc, formData, documentTitle);

  // Update Delivery information
  updateDeliveryInformation(updatedFlatDoc, formData, documentTitle);

  return updatedFlatDoc;
}

// Helper functions for applyFormDataToFlatDocument
function updateBackgroundInformation(updatedFlatDoc, formData, documentTitle) {
  // Generate background information if manufacturer details are available
  if (formData.manufacturerType) {
    let manufacturerName = "";
    if (formData.manufacturerType === "Individual") {
      manufacturerName =
        formData.manufacturer_individual_name || "The Manufacturer";
    } else if (formData.manufacturerType === "Company") {
      manufacturerName =
        formData.manufacturer_company_name || "The Manufacturer";
    } else if (formData.manufacturerType === "Partnership") {
      manufacturerName =
        formData.manufacturer_partnership_name || "The Manufacturer";
    }
    updatedFlatDoc[
      `${documentTitle}.AGREEMENT.2. BACKGROUND.2.1.content`
    ] = `${manufacturerName} is in the business of manufacturing products including those specified in this Agreement.`;
  }

  // Generate background information if customer details are available
  if (formData.customerType) {
    let customerName = "";
    if (formData.customerType === "Individual") {
      customerName = formData.customer_individual_name || "The Customer";
    } else if (formData.customerType === "Company") {
      customerName = formData.customer_company_name || "The Customer";
    } else if (formData.customerType === "Partnership") {
      customerName = formData.customer_partnership_name || "The Customer";
    }
    updatedFlatDoc[
      `${documentTitle}.AGREEMENT.2. BACKGROUND.2.2.content`
    ] = `${customerName} wishes to engage the Manufacturer to manufacture the Products in accordance with the terms set out in this Agreement.`;
  }

  // Add the standard third background paragraph
  updatedFlatDoc[`${documentTitle}.AGREEMENT.2. BACKGROUND.2.3.content`] =
    "The Manufacturer and the Customer therefore wish to enter into a contract in accordance with the provisions of this Agreement.";
}

function updateExecutionBlocks(updatedFlatDoc, formData, documentTitle) {
  // Update manufacturer execution date
  if (formData.executionDateManufacturer) {
    const formattedDate = formatDate(formData.executionDateManufacturer);
    let manufacturerBlock =
      updatedFlatDoc[
        `${documentTitle}.EXECUTION.signature_blocks.manufacturer`
      ] || "";
    manufacturerBlock = manufacturerBlock.replace(
      /\*\[\.\.\.\.\.\.\.\.\.\.\]\*/,
      formattedDate
    );
    updatedFlatDoc[`${documentTitle}.EXECUTION.signature_blocks.manufacturer`] =
      manufacturerBlock;
  }

  // Update customer execution date
  if (formData.executionDateCustomer) {
    const formattedDate = formatDate(formData.executionDateCustomer);
    let customerBlock =
      updatedFlatDoc[`${documentTitle}.EXECUTION.signature_blocks.customer`] ||
      "";
    customerBlock = customerBlock.replace(
      /\*\[\.\.\.\.\.\.\.\.\.\.\]\*/,
      formattedDate
    );
    updatedFlatDoc[`${documentTitle}.EXECUTION.signature_blocks.customer`] =
      customerBlock;
  }
}

function updateForecastingSection(updatedFlatDoc, formData, documentTitle) {
  // Update Forecast Date
  if (formData.forecastDateOption) {
    const forecastDateKey = `${documentTitle}.AGREEMENT.1. Definitions.1.1.Forecast Date`;

    if (formData.forecastDateOption === "1st day of each month") {
      updatedFlatDoc[forecastDateKey] =
        "[the 1st day of each calendar month during the Term and before the issue of a notice of termination of this Agreement]";
    } else if (formData.forecastDateOption === "15th day of each month") {
      updatedFlatDoc[forecastDateKey] =
        "[the 15th day of each calendar month during the Term and before the issue of a notice of termination of this Agreement]";
    } else if (formData.forecastDateOption === "Last day of each month") {
      updatedFlatDoc[forecastDateKey] =
        "[the last day of each calendar month during the Term and before the issue of a notice of termination of this Agreement]";
    } else if (
      formData.forecastDateOption === "Custom date" &&
      formData.customForecastDate
    ) {
      updatedFlatDoc[
        forecastDateKey
      ] = `[${formData.customForecastDate} during the Term and before the issue of a notice of termination of this Agreement]`;
    }
  }

  // Update Forecast Period
  if (formData.forecastPeriod) {
    const forecastPeriodKey = `${documentTitle}.AGREEMENT.1. Definitions.1.1.Forecast Period`;
    updatedFlatDoc[
      forecastPeriodKey
    ] = `means the period of [${formData.forecastPeriod} calendar months] beginning at the end of the calendar month in which the relevant Forecast is issued`;
  }

  // Update whether forecasts are binding
  if (formData.forecastBinding) {
    const forecastBindingKey = `${documentTitle}.AGREEMENT.8. Forecasting.8.3`;
    if (formData.forecastBinding === "Yes") {
      // Use option2 which makes forecasts binding
      const contentKey = `${documentTitle}.AGREEMENT.8. Forecasting.8.3.option2.content`;
      const aKey = `${documentTitle}.AGREEMENT.8. Forecasting.8.3.option2.a`;
      const bKey = `${documentTitle}.AGREEMENT.8. Forecasting.8.3.option2.b`;
      const additionalKey = `${documentTitle}.AGREEMENT.8. Forecasting.8.3.option2.additional`;

      updatedFlatDoc[contentKey] = "During each Forecast Period:";
      updatedFlatDoc[aKey] =
        "the Manufacturer shall supply the quantities of Products specified in the relevant Forecast to the Customer";
      updatedFlatDoc[bKey] =
        "the Customer shall purchase the quantities of Products specified in the relevant Forecast from the Manufacturer";
      updatedFlatDoc[additionalKey] =
        "under 1 or more Orders to be agreed by the parties acting reasonably.";

      // Remove option1 if it exists
      delete updatedFlatDoc[
        `${documentTitle}.AGREEMENT.8. Forecasting.8.3.option1`
      ];
    } else {
      // Use option1 which makes forecasts non-binding
      updatedFlatDoc[`${documentTitle}.AGREEMENT.8. Forecasting.8.3.option1`] =
        "The parties acknowledge that Forecasts are not binding in any way upon either the Customer or the Manufacturer.";

      // Remove option2 fields if they exist
      delete updatedFlatDoc[
        `${documentTitle}.AGREEMENT.8. Forecasting.8.3.option2.content`
      ];
      delete updatedFlatDoc[
        `${documentTitle}.AGREEMENT.8. Forecasting.8.3.option2.a`
      ];
      delete updatedFlatDoc[
        `${documentTitle}.AGREEMENT.8. Forecasting.8.3.option2.b`
      ];
      delete updatedFlatDoc[
        `${documentTitle}.AGREEMENT.8. Forecasting.8.3.option2.additional`
      ];
    }
  }
}

function updatePaymentTerms(updatedFlatDoc, formData, documentTitle) {
  // Update invoice timing
  if (formData.invoicingTiming) {
    const invoiceKey = `${documentTitle}.AGREEMENT.13. Payments.13.1.options.time`;
    if (formData.invoicingTiming === "Promptly") {
      updatedFlatDoc[invoiceKey] = '"[promptly]"';
    } else if (formData.invoicingTiming === "At any time") {
      updatedFlatDoc[invoiceKey] = '"[at any time]"';
    } else if (formData.invoicingTiming === "Within 7 days") {
      updatedFlatDoc[invoiceKey] = '"[within 7 days]"';
    } else if (
      formData.invoicingTiming === "Specific timing" &&
      formData.invoiceSpecificTiming
    ) {
      updatedFlatDoc[invoiceKey] = `\"[${formData.invoiceSpecificTiming}]\"`;
    }
  }

  // Update payment timing
  if (formData.paymentTiming) {
    const paymentTimingKey = `${documentTitle}.AGREEMENT.13. Payments.13.2.options`;
    if (formData.paymentTiming === "Upon issue of invoice") {
      updatedFlatDoc[paymentTimingKey] =
        '"[the issue of an invoice in accordance with this Clause 13]"';
    } else if (formData.paymentTiming === "Upon receipt of invoice") {
      updatedFlatDoc[paymentTimingKey] =
        '"[the receipt of an invoice issued in accordance with this Clause 13]"';
    }

    // Update payment days
    if (
      formData.paymentTiming === "Within specified days" &&
      formData.paymentDays
    ) {
      const daysKey = `${documentTitle}.AGREEMENT.13. Payments.13.2.content`;
      const currentValue = updatedFlatDoc[daysKey] || "";
      updatedFlatDoc[daysKey] = currentValue.replace(
        "[30 days]",
        `[${formData.paymentDays} days]`
      );
    }
  }

  // Update VAT handling
  if (formData.valueAddedTax) {
    const vatKey = `${documentTitle}.AGREEMENT.12. Charges.12.2`;
    if (formData.valueAddedTax === "Inclusive in stated amounts") {
      updatedFlatDoc[`${documentTitle}.AGREEMENT.12. Charges.12.2.option1`] =
        "All amounts stated in or in relation to this Agreement are, unless the context requires otherwise, stated [inclusive of any applicable value added taxes]";
      delete updatedFlatDoc[
        `${documentTitle}.AGREEMENT.12. Charges.12.2.option2`
      ];
    } else {
      updatedFlatDoc[`${documentTitle}.AGREEMENT.12. Charges.12.2.option2`] =
        "All amounts stated in or in relation to this Agreement are, unless the context requires otherwise, stated [exclusive of any applicable value added taxes, which will be added to those amounts and payable by the Customer to the Manufacturer]";
      delete updatedFlatDoc[
        `${documentTitle}.AGREEMENT.12. Charges.12.2.option1`
      ];
    }
  }

  // Update late payment interest
  if (formData.latePaymentInterest) {
    const interestKey = `${documentTitle}.AGREEMENT.13. Payments.13.4.a`;
    const currentValue = updatedFlatDoc[interestKey] || "";
    updatedFlatDoc[interestKey] = currentValue.replace(
      "8%",
      `${formData.latePaymentInterest}%`
    );
  }
}

function updateIPAndConfidentiality(updatedFlatDoc, formData, documentTitle) {
  // Update confidentiality duration
  if (formData.confidentialityDuration) {
    const confidentialityKey = `${documentTitle}.AGREEMENT.14. Confidentiality obligations.14.8.options`;
    if (formData.confidentialityDuration === "Indefinitely") {
      updatedFlatDoc[confidentialityKey] =
        '"The provisions of this Clause 14 shall continue in force [indefinitely following the termination of this Agreement]"';
    } else if (
      formData.confidentialityDuration === "Fixed period" &&
      formData.confidentialityPeriod
    ) {
      const period = formData.confidentialityPeriod.split(" ")[0];
      updatedFlatDoc[
        confidentialityKey
      ] = `\"The provisions of this Clause 14 shall continue in force for a period of [${period} years] following the termination of this Agreement, at the end of which period they will cease to have effect\"`;
    }
  }

  // Update confidentiality disclosure conditions
  if (formData.confidentialityDisclosureConditions) {
    const manufacturerKey = `${documentTitle}.AGREEMENT.14. Confidentiality obligations.14.1.b.options`;
    const customerKey = `${documentTitle}.AGREEMENT.14. Confidentiality obligations.14.2.b.options`;

    if (
      formData.confidentialityDisclosureConditions ===
      "With written consent only"
    ) {
      updatedFlatDoc[manufacturerKey] =
        '"[, and then only under conditions of confidentiality [approved in writing by the Customer]]"';
      updatedFlatDoc[customerKey] =
        '"[, and then only under conditions of confidentiality [approved in writing by the Manufacturer]]"';
    } else {
      updatedFlatDoc[manufacturerKey] =
        '"[, and then only under conditions of confidentiality [no less onerous than those contained in this Agreement]]"';
      updatedFlatDoc[customerKey] =
        '"[, and then only under conditions of confidentiality [no less onerous than those contained in this Agreement]]"';
    }
  }
}

function updateExclusivitySection(updatedFlatDoc, formData, documentTitle) {
  // Handle exclusivity option
  if (formData.exclusivityOption) {
    const exclusivityBase = `${documentTitle}.AGREEMENT.11`;

    if (formData.exclusivityOption === "Exclusive") {
      // Use option1 (exclusivity)
      const option1Title = `${exclusivityBase}.option1.title`;
      updatedFlatDoc[option1Title] = "Exclusivity";

      // Set exclusivity duration if provided
      if (formData.exclusivityDuration) {
        const durationKey = `${exclusivityBase}.option1.11.2.content`;
        let content = updatedFlatDoc[durationKey] || "";
        content = content.replace(
          "12 months",
          `${formData.exclusivityDuration} months`
        );
        updatedFlatDoc[durationKey] = content;
      }

      // Handle territory exclusivity
      if (formData.territoryExclusivity === "Yes") {
        // Keep territory restrictions
      } else if (formData.territoryExclusivity === "No") {
        // Remove territory restrictions by replacing "[ in the Territory]" with ""
        const keys = [
          `${exclusivityBase}.option1.11.2.a`,
          `${exclusivityBase}.option1.11.2.b`,
          `${exclusivityBase}.option1.11.3.a`,
          `${exclusivityBase}.option1.11.3.b`,
        ];

        keys.forEach((key) => {
          if (updatedFlatDoc[key]) {
            updatedFlatDoc[key] = updatedFlatDoc[key].replace(
              "[ in the Territory]",
              ""
            );
          }
        });
      }

      // Remove option2
      delete updatedFlatDoc[`${exclusivityBase}.option2`];
    } else {
      // Use option2 (no exclusivity)
      const option2Title = `${exclusivityBase}.option2.title`;
      updatedFlatDoc[option2Title] = "No exclusivity";

      // Remove option1
      delete updatedFlatDoc[`${exclusivityBase}.option1`];
    }
  }
}

function updateQualityAndWarranty(updatedFlatDoc, formData, documentTitle) {
  // Update product specification
  if (formData.specificationLevel || formData.qualityStandards) {
    let specText = "";

    if (formData.specificationLevel === "Basic") {
      specText =
        "Basic product specification including essential dimensions, materials, and functional requirements.";
    } else if (formData.specificationLevel === "Detailed") {
      specText =
        "Detailed product specification including precise measurements, material grades, and comprehensive functional requirements.";
    } else if (formData.specificationLevel === "Comprehensive") {
      specText =
        "Comprehensive product specification including exact measurements, premium material specifications, detailed functional requirements, and aesthetic considerations.";
    }

    if (formData.qualityStandards) {
      specText += ` Products must meet ${formData.qualityStandards} standards.`;
    }

    if (formData.testingProcedures) {
      specText += ` Testing procedures: ${formData.testingProcedures}`;
    }

    const scheduleKey = `${documentTitle}.SCHEDULE 1.MANUFACTURING PARTICULARS.1. Products and Product Specification.content`;
    updatedFlatDoc[scheduleKey] = specText;
  }

  // Update packaging requirements
  if (formData.packagingRequirements) {
    const deliveryKey = `${documentTitle}.SCHEDULE 2.TERMS AND CONDITIONS OF SUPPLY.1. Delivery.content`;
    let deliveryText = updatedFlatDoc[deliveryKey] || "";
    deliveryText += `\nPackaging Requirements: ${formData.packagingRequirements}`;
    updatedFlatDoc[deliveryKey] = deliveryText;
  }

  // Update quality specifications
  if (formData.defectiveRate || formData.inspectionRights) {
    let qualityText = "";

    if (formData.inspectionRights) {
      qualityText += `Inspection Rights: Customer has ${formData.inspectionRights.toLowerCase()} rights. `;
    }

    if (formData.defectiveRate) {
      qualityText += `Maximum acceptable defect rate: ${formData.defectiveRate}%. `;
    }

    if (formData.remedyPreference) {
      qualityText += `Preferred remedy for defective products: ${formData.remedyPreference}. `;
    }

    const qualityKey = `${documentTitle}.SCHEDULE 2.TERMS AND CONDITIONS OF SUPPLY.2. Quality.content`;
    updatedFlatDoc[qualityKey] = qualityText;
  }

  // Update warranty information
  if (formData.warrantyPeriod) {
    const warrantyText = `Warranty period: ${formData.warrantyPeriod} months from delivery.`;

    // Add to quality section
    const qualityKey = `${documentTitle}.SCHEDULE 2.TERMS AND CONDITIONS OF SUPPLY.2. Quality.content`;
    let currentQuality = updatedFlatDoc[qualityKey] || "";
    if (currentQuality) {
      updatedFlatDoc[qualityKey] = currentQuality + " " + warrantyText;
    } else {
      updatedFlatDoc[qualityKey] = warrantyText;
    }
  }

  // Update return process
  if (formData.returnProcess) {
    const returnKey = `${documentTitle}.SCHEDULE 2.TERMS AND CONDITIONS OF SUPPLY.4. Returns and Replacements.content`;
    updatedFlatDoc[returnKey] = formData.returnProcess;
  }

  // Update indemnity conditions
  if (formData.indemnityReporting) {
    const manufacturerKey = `${documentTitle}.AGREEMENT.16. Indemnities.16.2.options`;
    const customerKey = `${documentTitle}.AGREEMENT.16. Indemnities.16.4.options`;

    if (
      formData.indemnityReporting ===
      "Indemnity without compliance requirements"
    ) {
      updatedFlatDoc[manufacturerKey] =
        '"[without prejudice to the Manufacturer\'s obligations under Clause 16.1]"';
      updatedFlatDoc[customerKey] =
        '"[without prejudice to the Customer\'s obligations under Clause 16.3]"';
    } else {
      updatedFlatDoc[manufacturerKey] =
        '"[and the Manufacturer\'s obligation to indemnify the Customer under Clause 16.1 shall not apply unless the Customer complies with the requirements of this Clause 16.2]"';
      updatedFlatDoc[customerKey] =
        '"[and the Customer\'s obligation to indemnify the Manufacturer under Clause 16.3 shall not apply unless the Manufacturer complies with the requirements of this Clause 16.4]"';
    }
  }
}

function updateTerminationSettings(updatedFlatDoc, formData, documentTitle) {
  // Update termination notice period
  if (formData.terminationNotice) {
    const noticeKey = `${documentTitle}.AGREEMENT.19. Termination.19.1`;

    if (
      formData.terminationRightsOption === "Both parties equally" ||
      !formData.terminationRightsOption
    ) {
      updatedFlatDoc[`${noticeKey}.option2.content`] = updatedFlatDoc[
        `${noticeKey}.option2.content`
      ]?.replace(
        "[not less than 30 days']",
        `[not less than ${formData.terminationNotice} days']`
      );
    } else {
      // Handle manufacturer or customer-only termination rights
      let content = updatedFlatDoc[`${noticeKey}.option1.content`] || "";
      content = content.replace(
        "[not less than 30 days']",
        `[not less than ${formData.terminationNotice} days']`
      );
      updatedFlatDoc[`${noticeKey}.option1.content`] = content;
    }
  }

  // Update who can terminate
  if (formData.terminationRightsOption) {
    const noticeKey = `${documentTitle}.AGREEMENT.19. Termination.19.1`;

    if (formData.terminationRightsOption === "Both parties equally") {
      // Use option2
      if (updatedFlatDoc[`${noticeKey}.option1`]) {
        delete updatedFlatDoc[`${noticeKey}.option1`];
      }
    } else {
      // Use option1 with manufacturer or customer specifics
      if (formData.terminationRightsOption === "Manufacturer only") {
        updatedFlatDoc[`${noticeKey}.option1.content`] =
          "The Manufacturer may terminate this Agreement by giving to the Customer [not less than 30 days'] written notice of termination[, expiring [at the end of any [calendar month]] OR [after the end of the Minimum Term]]. The Customer may not terminate this Agreement except as expressly stated in this Agreement.";
      } else if (formData.terminationRightsOption === "Customer only") {
        updatedFlatDoc[`${noticeKey}.option1.content`] =
          "The Customer may terminate this Agreement by giving to the Manufacturer [not less than 30 days'] written notice of termination[, expiring [at the end of any [calendar month]] OR [after the end of the Minimum Term]]. The Manufacturer may not terminate this Agreement except as expressly stated in this Agreement.";
      }

      // Remove option2
      if (updatedFlatDoc[`${noticeKey}.option2`]) {
        delete updatedFlatDoc[`${noticeKey}.option2`];
      }
    }
  }

  // Update breach type for termination
  if (formData.breachType) {
    const breachKey = `${documentTitle}.AGREEMENT.19. Termination.19.2`;

    if (formData.breachType === "Any breach") {
      updatedFlatDoc[`${breachKey}.a.options`] =
        '"the other party commits any [breach] of this Agreement[, and the breach is not remediable]"';
      updatedFlatDoc[`${breachKey}.b.options`] =
        '"[the other party commits a [breach] of this Agreement, and the breach is remediable but the other party fails to remedy the breach within the period of [30 days] following the giving of a written notice to the other party requiring the breach to be remedied]"';
    } else if (formData.breachType === "Material breach only") {
      updatedFlatDoc[`${breachKey}.a.options`] =
        '"the other party commits any [material breach] of this Agreement[, and the breach is not remediable]"';
      updatedFlatDoc[`${breachKey}.b.options`] =
        '"[the other party commits a [material breach] of this Agreement, and the breach is remediable but the other party fails to remedy the breach within the period of [30 days] following the giving of a written notice to the other party requiring the breach to be remedied]"';
    }
  }

  // Update remedy period for breaches
  if (formData.remedyPeriod) {
    const breachKey = `${documentTitle}.AGREEMENT.19. Termination.19.2.b.options`;
    let content = updatedFlatDoc[breachKey] || "";
    content = content.replace("[30 days]", `[${formData.remedyPeriod} days]`);
    updatedFlatDoc[breachKey] = content;
  }

  // Update termination rights scope
  if (formData.terminationRightsScope) {
    const rightsKey = `${documentTitle}.AGREEMENT.19. Termination.19.5.options`;

    if (formData.terminationRightsScope === "Limited to agreement provisions") {
      updatedFlatDoc[rightsKey] =
        '"[This Agreement may only be terminated in accordance with its express provisions.]"';
    } else {
      updatedFlatDoc[rightsKey] =
        '"[The rights of termination set out in this Agreement shall not exclude any rights of termination available at law.]"';
    }
  }

  // Update dispute resolution
  if (formData.disputeResolution) {
    // This would be added to the governing law section
    const lawKey = `${documentTitle}.AGREEMENT.22. General.22.7.content`;
    const courtKey = `${documentTitle}.AGREEMENT.22. General.22.8.content`;

    // No direct match in the JSON for dispute resolution method,
    // but we can add a note about preferred method in the governing law
    if (formData.governingLaw) {
      let lawContent = `This Agreement shall be governed by and construed in accordance with [${formData.governingLaw}].`;
      if (
        formData.disputeResolution &&
        formData.disputeResolution !== "Litigation"
      ) {
        lawContent += ` Disputes shall be resolved through ${formData.disputeResolution.toLowerCase()}.`;
      }
      updatedFlatDoc[lawKey] = lawContent;
    }

    if (formData.governingLaw) {
      updatedFlatDoc[
        courtKey
      ] = `The courts of [${formData.governingLaw}] shall have exclusive jurisdiction to adjudicate any dispute arising under or in connection with this Agreement.`;
    }
  }
}

function updateDeliveryInformation(updatedFlatDoc, formData, documentTitle) {
  // Combine delivery terms into Schedule 2
  let deliveryContent = "";

  if (formData.deliveryTerms) {
    deliveryContent += `Delivery Terms: ${formData.deliveryTerms}. `;
  }

  if (formData.shippingResponsibility) {
    deliveryContent += `Shipping arranged by: ${formData.shippingResponsibility}. `;
  }

  if (formData.deliverySchedule) {
    deliveryContent += `Delivery Schedule: ${formData.deliverySchedule}. `;
  }

  if (formData.riskPassingPoint) {
    if (
      formData.riskPassingPoint === "Custom" &&
      formData.customRiskPassingPoint
    ) {
      deliveryContent += `Risk passes to customer: ${formData.customRiskPassingPoint}. `;
    } else {
      deliveryContent += `Risk passes to customer: ${formData.riskPassingPoint}. `;
    }
  }

  if (deliveryContent) {
    const deliveryKey = `${documentTitle}.SCHEDULE 2.TERMS AND CONDITIONS OF SUPPLY.1. Delivery.content`;
    updatedFlatDoc[deliveryKey] = deliveryContent;
  }

  // Update risk passing point
  if (formData.riskPassingPoint) {
    const riskKey = `${documentTitle}.SCHEDULE 2.TERMS AND CONDITIONS OF SUPPLY.3. Risk and Title.content`;
    let riskContent =
      "Risk of damage to or loss of the Products shall pass to the Customer ";

    if (formData.riskPassingPoint === "Ex works") {
      riskContent +=
        "when the Products are made available for collection at the Manufacturer's premises.";
    } else if (formData.riskPassingPoint === "On delivery") {
      riskContent +=
        "upon delivery to the Customer's designated delivery address.";
    } else if (formData.riskPassingPoint === "On acceptance") {
      riskContent +=
        "upon the Customer's acceptance of the Products following inspection.";
    } else if (
      formData.riskPassingPoint === "Custom" &&
      formData.customRiskPassingPoint
    ) {
      riskContent += formData.customRiskPassingPoint;
    }

    riskContent +=
      " Title to the Products shall pass to the Customer upon full payment of the Charges.";

    updatedFlatDoc[riskKey] = riskContent;
  }
}

// Main function for updating document with form data (using flatten/unflatten approach)
function updateDocumentWithFormData(formData) {
  // Get a clean template
  const templateDoc = getDocumentTemplate();

  // Flatten the template
  const flatTemplate = flattenObject(templateDoc);

  // Apply form data to the flat document
  const updatedFlatDoc = applyFormDataToFlatDocument(flatTemplate, formData);

  // Unflatten back to the original structure
  const updatedDoc = unflattenObject(updatedFlatDoc);

  // Update the current document
  window.currentDocument = updatedDoc;

  console.log("Updated document with form data:", window.currentDocument);
}

// Enable editing mode
function enableEditing() {
  const previewElem = document.getElementById("documentPreview");
  if (!previewElem) return;
  previewElem.contentEditable = true;
  previewElem.style.border = "1px dashed #aaa";
  document.getElementById("insertContentButton").style.display = "inline-block";
  document.getElementById("enableEditingButton").style.display = "none";
}

// Open and close modal for inserting new content
function openInsertDialog() {
  document.getElementById("insertDialog").style.display = "block";
  document.getElementById("newKey").focus();
}

function closeInsertDialog() {
  document.getElementById("insertDialog").style.display = "none";
  document.getElementById("documentPreview").focus();
}

/* --- Functions for Adding Key-Value Pair under AGREEMENT --- */
function openAddKeyValueDialog() {
  document.getElementById("addKeyValueDialog").style.display = "block";
  document.getElementById("newKVKey").focus();
}

function closeAddKeyValueDialog() {
  document.getElementById("addKeyValueDialog").style.display = "none";
  document.getElementById("keyContainer").focus();
}

function addKeyValuePair() {
  const key = document.getElementById("newKVKey").value.trim();
  const value = document.getElementById("newKVValue").value.trim();
  const errorDiv = document.getElementById("addDialogError");

  if (key === "" && value === "") {
    errorDiv.style.display = "block";
    errorDiv.textContent = "Please enter at least a key or a value.";
    return;
  } else {
    errorDiv.style.display = "none";
  }

  const documentTitle = Object.keys(window.currentDocument)[0];
  if (
    !window.currentDocument[documentTitle] ||
    !window.currentDocument[documentTitle]["AGREEMENT"]
  ) {
    if (!window.currentDocument[documentTitle]) {
      window.currentDocument[documentTitle] = {};
    }
    window.currentDocument[documentTitle]["AGREEMENT"] = {};
  }

  window.currentDocument[documentTitle]["AGREEMENT"][key] = { content: value };
  updatePreview();
  updateKeyEditor();

  document.getElementById("newKVKey").value = "";
  document.getElementById("newKVValue").value = "";
  closeAddKeyValueDialog();
}

// Functions for Adding Sub Key-Value Pair
function openAddSubKeyValueDialog() {
  const parentKeySelect = document.getElementById("parentKeySelect");
  parentKeySelect.innerHTML = "";

  const documentTitle = Object.keys(window.currentDocument)[0];
  if (
    window.currentDocument[documentTitle] &&
    window.currentDocument[documentTitle]["AGREEMENT"]
  ) {
    const agreementObj = window.currentDocument[documentTitle]["AGREEMENT"];
    Object.keys(agreementObj).forEach(function (key) {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = key;
      parentKeySelect.appendChild(option);
    });
  }

  document.getElementById("addSubKeyValueDialog").style.display = "block";
}

function closeAddSubKeyValueDialog() {
  document.getElementById("addSubKeyValueDialog").style.display = "none";
  document.getElementById("keyContainer").focus();
}

function addSubKeyValuePair() {
  const parentKey = document.getElementById("parentKeySelect").value;
  const subKey = document.getElementById("subKey").value.trim();
  const subValue = document.getElementById("subValue").value.trim();
  const errorDiv = document.getElementById("subDialogError");

  if (!parentKey || subKey === "" || subValue === "") {
    errorDiv.style.display = "block";
    errorDiv.textContent =
      "Please select a parent and enter both sub key and sub value.";
    return;
  } else {
    errorDiv.style.display = "none";
  }

  const documentTitle = Object.keys(window.currentDocument)[0];
  if (
    !window.currentDocument[documentTitle] ||
    !window.currentDocument[documentTitle]["AGREEMENT"]
  ) {
    alert("AGREEMENT section does not exist.");
    return;
  }

  const agreementObj = window.currentDocument[documentTitle]["AGREEMENT"];
  if (!agreementObj[parentKey]) {
    agreementObj[parentKey] = {};
  }

  agreementObj[parentKey][subKey] = { content: subValue };
  updatePreview();
  updateKeyEditor();

  document.getElementById("subKey").value = "";
  document.getElementById("subValue").value = "";
  closeAddSubKeyValueDialog();
}

/* --- Get Ordered Paths for Key Editor --- */
function getOrderedPaths(obj) {
  let paths = [];
  const documentTitle = Object.keys(obj)[0];
  if (documentTitle) {
    const mainContent = obj[documentTitle];
    sectionOrder.forEach((section) => {
      if (mainContent[section]) {
        processSectionForPaths(
          mainContent[section],
          `${documentTitle}.${section}`
        );
      }
    });
  }

  function processSectionForPaths(section, currentPath) {
    if (!section || typeof section !== "object") return;

    let keys = Object.keys(section);
    if (currentPath.endsWith("AGREEMENT")) {
      const actualKeys = Object.keys(section);
      keys = agreementSectionOrder
        .filter((k) => actualKeys.includes(k))
        .concat(actualKeys.filter((k) => !agreementSectionOrder.includes(k)));
    }

    keys.forEach((key) => {
      const value = section[key];
      if (typeof value === "object" && value !== null) {
        if ("content" in value) {
          paths.push({
            path: `${currentPath}.${key}.content`,
            value: value.content,
          });
        } else {
          processSectionForPaths(value, `${currentPath}.${key}`);
        }
      } else if (typeof value === "string") {
        paths.push({ path: `${currentPath}.${key}`, value: value });
      }
    });
  }

  return paths;
}

/* --- Update Document Preview --- */
function updatePreview() {
  const previewElem = document.getElementById("documentPreview");
  if (!previewElem) {
    console.error("Preview element not found");
    return;
  }

  try {
    const html = convertToHtml(window.currentDocument);
    previewElem.innerHTML = html;
  } catch (error) {
    console.error("Error updating preview:", error);
    previewElem.innerHTML =
      '<div class="error">Error loading document preview</div>';
  }
}

/* --- Update Key Editor --- */
function updateKeyEditor() {
  const container = document.getElementById("keyContainer");
  if (!container) {
    console.error("Key container element not found");
    return;
  }

  try {
    const paths = getOrderedPaths(window.currentDocument);
    const html = paths
      .map(({ path, value }) => {
        const isDateOrParties =
          path.startsWith("Manufacturing Agreement.DATE") ||
          path.startsWith("Manufacturing Agreement.PARTIES");

        return `
                    <div class="key-editor-item">
                        <div class="key-path"><strong>${path}</strong></div>
                        <div class="value-section">
                            <label>Current Value:</label>
                            <input type="text" class="value-input" value="${
                              value || ""
                            }" readonly data-key="${path}" data-original-value="${
          value || ""
        }">

                            <label>Custom Prompt (optional):</label>
                            <textarea class="prompt-input" placeholder="Enter custom instructions for AI..." data-key="${path}"></textarea>

                            <label>AI Suggestion:</label>
                            <input type="text" class="value-input" data-ai-suggestion="${path}" readonly>

                            <div class="button-group">
                                ${
                                  isDateOrParties
                                    ? `<button class="btn btn-edit edit-button" onclick="editValue('${path}')">Edit</button>`
                                    : `<button class="btn btn-edit ai-button" onclick="updateValueWithAI('${path}')">Get AI Suggestion</button>
                                       <button class="btn btn-edit edit-button" onclick="editValue('${path}')">Edit</button>`
                                }
                                <button class="btn btn-edit save-button" onclick="saveValue('${path}')" disabled>Save Changes</button>
                            </div>
                            <div class="error" id="error-${path}" style="display: none;"></div>
                            <div class="success" id="success-${path}" style="display: none;"></div>
                        </div>
                    </div>
                `;
      })
      .join("");

    container.innerHTML = html;

    document.querySelectorAll(".value-input").forEach((input) => {
      input.addEventListener("input", function () {
        const path = this.getAttribute("data-key");
        const originalValue = this.getAttribute("data-original-value");
        const saveButton = document.querySelector(
          `button.save-button[onclick="saveValue('${path}')"]`
        );
        if (this.value !== originalValue) {
          saveButton.disabled = false;
        } else {
          saveButton.disabled = true;
        }
      });
    });
  } catch (error) {
    console.error("Error updating key editor:", error);
    container.innerHTML = '<div class="error">Error loading key editor</div>';
  }
}

/* --- Edit Value --- */
function editValue(path) {
  const input = document.querySelector(`input[data-key="${path}"]`);
  const editButton = document.querySelector(
    `button.edit-button[onclick="editValue('${path}')"]`
  );
  const saveButton = document.querySelector(
    `button.save-button[onclick="saveValue('${path}')"]`
  );
  const aiButton = document.querySelector(
    `button.ai-button[onclick="updateValueWithAI('${path}')"]`
  );

  input.readOnly = false;
  editButton.style.display = "none";
  if (aiButton) {
    aiButton.style.display = "none";
  }
  if (
    path.startsWith("Manufacturing Agreement.DATE") ||
    path.startsWith("Manufacturing Agreement.PARTIES")
  ) {
    saveButton.disabled = false;
  }
}

/* --- Utility Functions --- */
function splitPath(path) {
  let parts = path.split(".");
  const specialIndex = parts.findIndex((token) => token.trim() === "PARTIES");
  if (specialIndex === -1) {
    return mergeWithRules(parts);
  }
  const leftParts = parts.slice(0, specialIndex);
  const mergedLeft = mergeWithRules(leftParts);
  const rightParts = parts.slice(specialIndex).map((t) => t.trim());
  return mergedLeft.concat(rightParts);
}

function mergeWithRules(tokenArray) {
  let result = [];
  for (let i = 0; i < tokenArray.length; i++) {
    let part = tokenArray[i].trim();
    if (i < tokenArray.length - 1) {
      let nextPart = tokenArray[i + 1].trim();
      if (/^\d+$/.test(part) && /^\D/.test(nextPart)) {
        result.push(part + ". " + nextPart);
        i++;
        continue;
      }
      if (/^\d+$/.test(part) && /^\d+$/.test(nextPart)) {
        result.push(part + "." + nextPart);
        i++;
        continue;
      }
    }
    result.push(part);
  }
  return result;
}

/* --- Save Value --- */
function saveValue(path) {
  const input = document.querySelector(`input[data-key="${path}"]`);
  const suggestion = document.querySelector(
    `input[data-ai-suggestion="${path}"]`
  )?.value;
  const editButton = document.querySelector(
    `button.edit-button[onclick="editValue('${path}')"]`
  );
  const aiButton = document.querySelector(
    `button.ai-button[onclick="updateValueWithAI('${path}')"]`
  );
  const newValue = suggestion || input.value;

  if (!newValue) return;

  try {
    const pathParts = splitPath(path);
    let current = window.currentDocument;

    for (let i = 0; i < pathParts.length - 1; i++) {
      let part = pathParts[i].replace(/\["(.*)"\]/, "$1");
      if (!current[part]) current[part] = {};
      current = current[part];
    }

    let lastPart = pathParts[pathParts.length - 1].replace(/\["(.*)"\]/, "$1");
    current[lastPart] = newValue;

    const previewElement = document.querySelector(
      `span[data-value-path="${path}"]`
    );
    if (previewElement) {
      let keyLabel = previewElement.querySelector("strong");
      if (keyLabel) {
        keyLabel.nextSibling.nodeValue = " " + newValue;
      } else {
        previewElement.textContent = newValue;
      }
    }

    const currentValueInput = document.querySelector(
      `input[data-key="${path}"]`
    );
    if (currentValueInput) {
      currentValueInput.value = newValue;
      currentValueInput.readOnly = true;
      currentValueInput.setAttribute("data-original-value", newValue);
    }

    const suggestionInput = document.querySelector(
      `input[data-ai-suggestion="${path}"]`
    );
    if (suggestionInput) {
      suggestionInput.value = "";
    }

    const saveButton = document.querySelector(
      `button.save-button[onclick="saveValue('${path}')"]`
    );
    if (saveButton) {
      saveButton.disabled = true;
    }

    if (aiButton) aiButton.style.display = "";
    if (editButton) editButton.style.display = "";

    const successDiv = document.getElementById(`success-${path}`);
    if (successDiv) {
      successDiv.textContent = "Changes saved successfully";
      successDiv.style.display = "block";
      setTimeout(() => {
        successDiv.style.display = "none";
      }, 3000);
    }

    const errorDiv = document.getElementById(`error-${path}`);
    if (errorDiv) errorDiv.style.display = "none";
  } catch (error) {
    console.error("Error saving value:", error);
    const errorDiv = document.getElementById(`error-${path}`);
    if (errorDiv) {
      errorDiv.textContent = "Failed to save changes";
      errorDiv.style.display = "block";
    }
  }
}

/* --- Download Functions --- */
async function downloadPdf() {
  try {
    const response = await fetch("/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        document: window.currentDocument,
        format: "pdf",
      }),
    });

    if (!response.ok) throw new Error("Download failed. Please try again.");

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "document.pdf";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error("Download failed:", error);
    alert(error.message);
  }
}

function downloadWordDocx() {
  const content = document.getElementById("documentPreview").innerHTML;
  const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Document</title>
            <style>
                body {
                    font-family: Verdana;
                    font-size: 14px;
                    line-height: 1.8;
                    color: #333;
                    background-color: #fff;
                    margin: 20px;
                }
                h1, h2, h3, h4, h5, h6 {
                    font-family: Verdana;
                    font-size: 12px;
                    color: #2c3e50;
                    margin: 25px 0 15px;
                }
                p { margin: 15px 0; }
                ul, ol {
                    margin: 15px 0;
                    padding-left: 40px;
                }
                li { margin-bottom: 10px; }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                }
                table, th, td { border: 1px solid #ddd; }
                th, td {
                    padding: 10px;
                    text-align: left;
                }
                hr { border: none; margin: 30px 0; }
                .key, strong, b {
                    font-weight: bold;
                    margin-right: 15px;
                    display: inline-block;
                    min-width: 120px;
                }
                .value { font-weight: normal; }
                .nested {
                    margin-left: 30px;
                    margin-top: 10px;
                    margin-bottom: 10px;
                    padding-left: 10px;
                    border-left: 2px dashed #ddd;
                }
                .nested .key,
                .nested strong,
                .nested b {
                    display: block;
                    margin-bottom: 5px;
                }
            </style>
        </head>
        <body>
            ${content}
        </body>
        </html>
    `;

  const converted = htmlDocx.asBlob(html);
  const url = URL.createObjectURL(converted);
  const link = document.createElement("a");
  link.href = url;
  link.download = "document.docx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* --- Expose functions to global scope --- */
// Add event listeners for text selection
const docPreview = document.getElementById("documentPreview");
if (docPreview) {
  docPreview.addEventListener("mouseup", handleTextSelection);
  docPreview.addEventListener("keyup", handleTextSelection);
}
window.openAddKeyValueDialog = openAddKeyValueDialog;
window.closeAddKeyValueDialog = closeAddKeyValueDialog;
window.addKeyValuePair = addKeyValuePair;
window.addSubKeyValuePair = addSubKeyValuePair;
window.enableEditing = enableEditing;
window.openInsertDialog = openInsertDialog;
window.closeInsertDialog = closeInsertDialog;
window.editValue = editValue;
window.saveValue = saveValue;
window.downloadWordDocx = downloadWordDocx;
window.showQuestionnaire = showQuestionnaire;
window.submitQuestionnaire = submitQuestionnaire;
window.handleFieldChange = handleFieldChange;
window.updateValueWithAI = updateValueWithAI;
