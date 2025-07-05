// Document order configuration
const sectionOrder = ["DATE", "PARTIES", "AGREEMENT", "EXECUTION"];

const assignmentSectionOrder = [
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
    const keys = key.split(".");
    let current = result;

    keys.forEach((k, i) => {
      if (i === keys.length - 1) {
        current[k] = value;
      } else {
        // Always create an object, never an array
        if (!current[k] || typeof current[k] !== "object") {
          current[k] = {};
        }
        current = current[k];
      }
    });
  });

  return result;
}
/**
/**
 * Initialize the document template by storing a clean copy
 * of the initial document structure
 */
let documentTemplate;
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
// Predefined questions for document
// Manufacturing Agreement Questions
const documentQuestions = {
  step1: {
    title: "Agreement Title & Parties",

    agreementDate: { question: "Agreement Date", type: "date" },
    manufacturerType: {
      question: "Manufacturer Type",
      type: "select",
      options: ["Individual", "Company", "Partnership"],
    },
    manufacturerName: { question: "Manufacturer Name", type: "text" },
    manufacturerAddress: { question: "Manufacturer Address", type: "text" },
    manufacturerRegNumber: {
      question: "Manufacturer Registration Number (if company)",
      type: "text",
      showIf: "manufacturerType=Company",
    },
    customerType: {
      question: "Customer Type",
      type: "select",
      options: ["Individual", "Company", "Partnership"],
    },
    customerName: { question: "Customer Name", type: "text" },
    customerAddress: { question: "Customer Address", type: "text" },
    customerRegNumber: {
      question: "Customer Registration Number (if company)",
      type: "text",
      showIf: "customerType=Company",
    },
  },
  step2: {
    title: "Definitions",
    products: { question: "Describe the Products", type: "text" },
    territory: { question: "Territory", type: "text" },
    effectiveDate: { question: "Effective Date", type: "date" },
    additionalDefinitions: {
      question: "Additional Definitions (optional)",
      type: "textarea",
    },
  },
  step3: {
    title: "Background",
    manufacturerBackground: {
      question: "Background from Manufacturer's perspective",
      type: "textarea",
    },
    customerBackground: {
      question: "Background from Customer's perspective",
      type: "textarea",
    },
  },
  step4: {
    title: "Term",
    termType: {
      question: "Term Type",
      type: "select",
      options: ["Indefinite", "Until Date", "Until Event"],
    },
    termDate: {
      question: "End Date (if applicable)",
      type: "date",
      showIf: "termType=Until Date",
    },
    termEvent: {
      question: "End Event (if applicable)",
      type: "text",
      showIf: "termType=Until Event",
    },
  },
  step5: {
    title: "Order Procedure",
    manufacturingRequestDetails: {
      question: "Describe Manufacturing Request Details",
      type: "textarea",
    },
    manufacturingOfferDetails: {
      question: "Describe Manufacturing Offer Details",
      type: "textarea",
    },
    additionalOrderProcedure: {
      question: "Additional Order Procedure Details (optional)",
      type: "textarea",
    },
  },
  step6: {
    title: "Product Specification",
    productSpecification: {
      question: "Product Specification Details",
      type: "textarea",
    },
    productSpecificationWarranties: {
      question: "Product Specification Warranties",
      type: "textarea",
    },
    productSpecificationIP: {
      question: "Product Specification IP Statement",
      type: "textarea",
    },
  },
  step7: {
    title: "Minimum Quantity",
    minimumQuantity: {
      question: "Minimum Quantity of Products",
      type: "text",
    },
    minimumQuantityPeriod: {
      question: "Minimum Quantity Period",
      type: "text",
    },
  },
  step8: {
    title: "Forecasting",
    forecastPeriod: {
      question: "Forecast Period (months)",
      type: "number",
    },
    forecastDetails: {
      question: "Forecast Details",
      type: "textarea",
    },
  },
  step9: {
    title: "Charges",
    chargesAmount: {
      question: "Charges Amount",
      type: "text",
    },
    chargesVAT: {
      question: "Are charges inclusive of VAT?",
      type: "select",
      options: ["Inclusive", "Exclusive"],
    },
    chargesIncrease: {
      question: "Can charges be increased?",
      type: "checkbox",
    },
  },
  step10: {
    title: "Payments",
    invoiceTiming: {
      question: "When is the invoice issued?",
      type: "text",
    },
    paymentDueDays: {
      question: "Payment Due (days after invoice)",
      type: "number",
    },
    paymentMethods: {
      question: "Allowed Payment Methods",
      type: "checkboxGroup",
      options: [
        "Debit Card",
        "Credit Card",
        "Direct Debit",
        "Bank Transfer",
        "Cheque",
      ],
    },
    latePaymentInterest: {
      question: "Late Payment Interest Rate",
      type: "text",
    },
  },
  step11: {
    title: "Confidentiality",
    confidentialityPurpose: {
      question: "Permitted Purpose for Confidential Information",
      type: "textarea",
    },
    confidentialityDuration: {
      question: "Duration of Confidentiality Obligations (years)",
      type: "number",
    },
  },
  step12: {
    title: "Warranties",
    manufacturerWarranty: {
      question: "Manufacturer Warranty Statement",
      type: "textarea",
    },
    customerWarranty: {
      question: "Customer Warranty Statement",
      type: "textarea",
    },
  },
  step13: {
    title: "Indemnities",
    manufacturerIndemnity: {
      question: "Manufacturer Indemnity Clause",
      type: "textarea",
    },
    customerIndemnity: {
      question: "Customer Indemnity Clause",
      type: "textarea",
    },
    indemnityLimitations: {
      question: "Are indemnities subject to limitations?",
      type: "checkbox",
    },
  },
  step14: {
    title: "Limitations of Liability",
    liabilityCap: {
      question: "Liability Cap Amount",
      type: "text",
    },
    liabilityExclusions: {
      question: "Exclusions from Liability",
      type: "textarea",
    },
  },
  step15: {
    title: "Force Majeure",
    forceMajeureClause: {
      question: "Force Majeure Clause",
      type: "textarea",
    },
  },
  step16: {
    title: "Termination",
    terminationNotice: {
      question: "Termination Notice Period (days)",
      type: "number",
    },
    terminationEvents: {
      question: "Events Allowing Immediate Termination",
      type: "textarea",
    },
  },
  step17: {
    title: "Notices",
    manufacturerContact: {
      question: "Manufacturer Contact Details for Notices",
      type: "textarea",
    },
    customerContact: {
      question: "Customer Contact Details for Notices",
      type: "textarea",
    },
    noticeMethods: {
      question: "Permitted Methods of Notice",
      type: "checkboxGroup",
      options: ["Personal Delivery", "Courier", "Recorded Post", "Email"],
    },
  },
  step18: {
    title: "Governing Law & Jurisdiction",
    governingLaw: {
      question: "Governing Law",
      type: "text",
      default: "English law",
    },
    jurisdiction: {
      question: "Jurisdiction",
      type: "text",
      default: "England",
    },
  },
  step19: {
    title: "Signatures",
    manufacturerSignatory: {
      question: "Manufacturer Signatory Name",
      type: "text",
    },
    manufacturerSignDate: {
      question: "Manufacturer Signature Date",
      type: "date",
    },
    customerSignatory: {
      question: "Customer Signatory Name",
      type: "text",
    },
    customerSignDate: {
      question: "Customer Signature Date",
      type: "date",
    },
  },
};
// ...existing code...
const documentPathMap = {
  // Step 1: Agreement Title & Parties

  agreementDate: ["Manufacturing agreement.DATE.content"],
  manufacturerType: ["Manufacturing agreement.PARTIES.1.content"],
  manufacturerName: ["Manufacturing agreement.PARTIES.1.content|0"],
  manufacturerAddress: ["Manufacturing agreement.PARTIES.1.content|1"],
  manufacturerRegNumber: ["Manufacturing agreement.PARTIES.1.content|2"],
  customerType: ["Manufacturing agreement.PARTIES.2.content"],
  customerName: ["Manufacturing agreement.PARTIES.2.content|0"],
  customerAddress: ["Manufacturing agreement.PARTIES.2.content|1"],
  customerRegNumber: ["Manufacturing agreement.PARTIES.2.content|2"],

  // Step 2: Definitions
  products: ["Manufacturing agreement.AGREEMENT.1. Definitions.1.1.Products"],
  territory: ["Manufacturing agreement.AGREEMENT.1. Definitions.1.1.Territory"],
  effectiveDate: [
    "Manufacturing agreement.AGREEMENT.1. Definitions.1.1.Effective Date",
  ],
  additionalDefinitions: [
    "Manufacturing agreement.AGREEMENT.1. Definitions.1.1.additional",
  ],

  // Step 3: Background
  manufacturerBackground: [
    "Manufacturing agreement.AGREEMENT.2. BACKGROUND.1.content",
  ],
  customerBackground: [
    "Manufacturing agreement.AGREEMENT.2. BACKGROUND.2.content",
  ],

  // Step 4: Term
  termType: ["Manufacturing agreement.AGREEMENT.3. Term.3.2.content"],
  termDate: ["Manufacturing agreement.AGREEMENT.3. Term.3.2.content|0"],
  termEvent: ["Manufacturing agreement.AGREEMENT.3. Term.3.2.content|1"],

  // Step 5: Order Procedure
  manufacturingRequestDetails: [
    "Manufacturing agreement.AGREEMENT.4. Order procedure.4.2.content",
  ],
  manufacturingOfferDetails: [
    "Manufacturing agreement.AGREEMENT.4. Order procedure.4.3.content",
  ],
  additionalOrderProcedure: [
    "Manufacturing agreement.AGREEMENT.4. Order procedure.4.2.additional",
  ],

  // Step 6: Product Specification
  productSpecification: [
    "Manufacturing agreement.AGREEMENT.6. Product Specification.6.1.content",
  ],
  productSpecificationWarranties: [
    "Manufacturing agreement.AGREEMENT.6. Product Specification.6.2.content",
  ],
  productSpecificationIP: [
    "Manufacturing agreement.AGREEMENT.6. Product Specification.6.3.content",
  ],

  // Step 7: Minimum Quantity
  minimumQuantity: [
    "Manufacturing agreement.AGREEMENT.7. Minimum Quantity.7.1.a",
  ],
  minimumQuantityPeriod: [
    "Manufacturing agreement.AGREEMENT.7. Minimum Quantity.7.1.content",
  ],

  // Step 8: Forecasting
  forecastPeriod: [
    "Manufacturing agreement.AGREEMENT.1. Definitions.1.1.Forecast Period",
  ],
  forecastDetails: [
    "Manufacturing agreement.AGREEMENT.8. Forecasting.8.2.content",
  ],

  // Step 9: Terms and Conditions of Supply
  supplyTerms: [
    "Manufacturing agreement.AGREEMENT.9. Terms and conditions of supply.9.1.content",
  ],

  // Step 10: Intellectual Property Rights
  ipAssignment: [
    "Manufacturing agreement.AGREEMENT.10. Intellectual Property Rights.10.1.content",
  ],
  ipNotice: [
    "Manufacturing agreement.AGREEMENT.10. Intellectual Property Rights.10.4.content",
  ],

  // Step 11: Exclusivity
  exclusivity: [
    "Manufacturing agreement.AGREEMENT.11. Exclusivity.11.1.content",
  ],
  exclusivityPeriod: [
    "Manufacturing agreement.AGREEMENT.11. Exclusivity.11.2.content",
  ],
  exclusivityTerritory: [
    "Manufacturing agreement.AGREEMENT.11. Exclusivity.11.2.a",
  ],

  // Step 12: Charges
  chargesAmount: ["Manufacturing agreement.AGREEMENT.12. Charges.12.1.content"],
  chargesVAT: ["Manufacturing agreement.AGREEMENT.12. Charges.12.2.content"],
  chargesIncrease: [
    "Manufacturing agreement.AGREEMENT.12. Charges.12.3.content",
  ],

  // Step 13: Payments
  invoiceTiming: [
    "Manufacturing agreement.AGREEMENT.13. Payments.13.1.content",
  ],
  paymentDueDays: [
    "Manufacturing agreement.AGREEMENT.13. Payments.13.2.content",
  ],
  paymentMethods: [
    "Manufacturing agreement.AGREEMENT.13. Payments.13.3.content",
  ],
  latePaymentInterest: [
    "Manufacturing agreement.AGREEMENT.13. Payments.13.4.a",
  ],

  // Step 14: Confidentiality
  confidentialityPurpose: [
    "Manufacturing agreement.AGREEMENT.14. Confidentiality obligations.14.1.e",
    "Manufacturing agreement.AGREEMENT.14. Confidentiality obligations.14.2.e",
  ],
  confidentialityDuration: [
    "Manufacturing agreement.AGREEMENT.14. Confidentiality obligations.14.8.content",
  ],

  // Step 15: Warranties
  manufacturerWarranty: [
    "Manufacturing agreement.AGREEMENT.15. Warranties.15.1.content",
  ],
  customerWarranty: [
    "Manufacturing agreement.AGREEMENT.15. Warranties.15.2.content",
  ],

  // Step 16: Indemnities
  manufacturerIndemnity: [
    "Manufacturing agreement.AGREEMENT.16. Indemnities.16.1.content",
  ],
  customerIndemnity: [
    "Manufacturing agreement.AGREEMENT.16. Indemnities.16.3.content",
  ],
  indemnityLimitations: [
    "Manufacturing agreement.AGREEMENT.16. Indemnities.16.5.content",
  ],

  // Step 17: Limitations of Liability
  liabilityCap: [
    "Manufacturing agreement.AGREEMENT.17. Limitations and exclusions of liability.17.10.a",
    "Manufacturing agreement.AGREEMENT.17. Limitations and exclusions of liability.17.11.a",
  ],
  liabilityExclusions: [
    "Manufacturing agreement.AGREEMENT.17. Limitations and exclusions of liability.17.3.content",
    "Manufacturing agreement.AGREEMENT.17. Limitations and exclusions of liability.17.4.content",
    "Manufacturing agreement.AGREEMENT.17. Limitations and exclusions of liability.17.5.content",
    "Manufacturing agreement.AGREEMENT.17. Limitations and exclusions of liability.17.6.content",
    "Manufacturing agreement.AGREEMENT.17. Limitations and exclusions of liability.17.7.content",
    "Manufacturing agreement.AGREEMENT.17. Limitations and exclusions of liability.17.8.content",
    "Manufacturing agreement.AGREEMENT.17. Limitations and exclusions of liability.17.9.content",
  ],

  // Step 18: Force Majeure
  forceMajeureClause: [
    "Manufacturing agreement.AGREEMENT.18. Force Majeure Event.18.1.content",
  ],

  // Step 19: Termination
  terminationNotice: [
    "Manufacturing agreement.AGREEMENT.19. Termination.19.1.content",
    "Manufacturing agreement.AGREEMENT.19. Termination.19.2.b",
  ],
  terminationEvents: [
    "Manufacturing agreement.AGREEMENT.19. Termination.19.2.content",
    "Manufacturing agreement.AGREEMENT.19. Termination.19.3.content",
  ],

  // Step 20: Effects of Termination
  effectsOfTermination: [
    "Manufacturing agreement.AGREEMENT.20. Effects of termination.20.1.content",
  ],

  // Step 21: Notices
  manufacturerContact: ["Manufacturing agreement.AGREEMENT.21. Notices.21.2.a"],
  customerContact: ["Manufacturing agreement.AGREEMENT.21. Notices.21.2.b"],
  noticeMethods: [
    "Manufacturing agreement.AGREEMENT.21. Notices.21.1.a",
    "Manufacturing agreement.AGREEMENT.21. Notices.21.1.b",
  ],

  // Step 22: General
  waiverClause: ["Manufacturing agreement.AGREEMENT.22. General.22.1.content"],
  severabilityClause: [
    "Manufacturing agreement.AGREEMENT.22. General.22.2.content",
  ],
  variationClause: [
    "Manufacturing agreement.AGREEMENT.22. General.22.3.content",
  ],
  assignmentClause: [
    "Manufacturing agreement.AGREEMENT.22. General.22.4.content",
  ],
  thirdPartyRights: [
    "Manufacturing agreement.AGREEMENT.22. General.22.5.content",
  ],
  entireAgreementClause: [
    "Manufacturing agreement.AGREEMENT.22. General.22.6.content",
  ],
  governingLaw: ["Manufacturing agreement.AGREEMENT.22. General.22.7.content"],
  jurisdiction: ["Manufacturing agreement.AGREEMENT.22. General.22.8.content"],

  // Step 23: Interpretation
  interpretationClause: [
    "Manufacturing agreement.AGREEMENT.23. Interpretation.23.1.content",
  ],

  // Step 24: Signatures
  manufacturerSignatory: [
    "Manufacturing agreement.EXECUTION.signature_blocks.manufacturer",
  ],
  manufacturerSignDate: [
    "Manufacturing agreement.EXECUTION.signature_blocks.manufacturer",
  ],
  customerSignatory: [
    "Manufacturing agreement.EXECUTION.signature_blocks.customer",
  ],
  customerSignDate: [
    "Manufacturing agreement.EXECUTION.signature_blocks.customer",
  ],
};
// ...existing code...//  * Highlights document sections affected by a specific form field
//  * and scrolls to the highlighted element after a brief delay
//  * @param {string} fieldId - The ID of the form field being focused
//  */
function highlightDocumentSection(fieldId) {
  // Clear any existing highlights first
  clearHighlights();

  // Get the paths this field affects
  const paths = documentPathMap[fieldId];
  if (!paths || paths.length === 0) return;

  // Find and highlight all elements with matching data-value-path
  const previewElem = document.getElementById("documentPreview");
  paths.forEach((path) => {
    // Find elements with this path
    const elements = previewElem.querySelectorAll(
      `[data-value-path="${path}"]`
    );
    if (elements.length === 0) {
      // Try finding parent section if exact path not found
      const basePathParts = path.split(".");
      basePathParts.pop(); // Remove the last part (usually "content")
      const basePath = basePathParts.join(".");
      const parentElements = previewElem.querySelectorAll(
        `[data-path="${basePath}"]`
      );

      parentElements.forEach((elem) => {
        elem.classList.add("highlighted-section");
      });
    } else {
      elements.forEach((elem) => {
        elem.classList.add("highlighted");
      });
    }
  });

  // Delay scrolling by 1ms after highlighting
  setTimeout(() => {
    // Scroll to the first highlighted element
    const firstHighlighted = document.querySelector(
      ".highlighted, .highlighted-section"
    );
    if (firstHighlighted) {
      firstHighlighted.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 1);
}

/**
 * Removes all highlighting from the document preview
 */
function clearHighlights() {
  const previewElem = document.getElementById("documentPreview");
  const highlightedElements = previewElem.querySelectorAll(
    ".highlighted, .highlighted-section"
  );
  highlightedElements.forEach((element) => {
    element.classList.remove("highlighted");
    element.classList.remove("highlighted-section");
  });
}

// Store form data between steps
let formDataStore = {};

document.addEventListener("DOMContentLoaded", async function () {
  console.log("Document initialization started");

  if (!window.currentDocument) {
    console.error("No document found in window.currentDocument");
    window.currentDocument = { "Sublease Agreement": {} };
  }

  try {
    // Initialize the document template
    initializeDocumentTemplate();

    // Build questionnaire and preview
    showQuestionnaire();
    updatePreview();

    // Safely register highlight events once preview is in DOM
    setTimeout(() => {
      const previewElem = document.getElementById("documentPreview");
      if (previewElem) {
        previewElem.addEventListener("mouseup", handleTextSelection);
        previewElem.addEventListener("keyup", handleTextSelection);
        registerHighlightEvents();
      } else {
        console.warn(
          "No #documentPreview element—skipping selection/highlight setup"
        );
      }
    }, 500);

    // Wire up AI Edit dialog only if button exists
    const aiSubmit = document.getElementById("submit-ai-edit");
    if (aiSubmit) {
      aiSubmit.addEventListener("click", submitAIEditRequest);
    } else {
      console.warn("No #submit-ai-edit button found—AI editing disabled");
    }

    console.log("Document initialization completed");
  } catch (error) {
    console.error("Error during initialization:", error);
  }
});

// Convert document object to HTML for preview
// Updated convertToHtml to use documentQuestions and documentPathMap

/**
 * Safely retrieves a nested value from an object using a dot-separated path.
 */
function getValue(obj, path) {
  return path.split(".").reduce((acc, key) => {
    if (acc === undefined || acc === null) return undefined;
    // handle array indices
    const arrayIndexMatch = key.match(/(\w+)\[(\d+)\]/);
    if (arrayIndexMatch) {
      const [, prop, idx] = arrayIndexMatch;
      return acc[prop] && acc[prop][parseInt(idx, 10)];
    }
    return acc[key];
  }, obj);
}

/**
 * Converts a document JSON and its questionnaire config into HTML.
 */
function convertToHtml(document) {
  let html = [];
  const documentTitle = Object.keys(document)[0];
  if (documentTitle) {
    html.push(
      `<div class="document-title"><strong>${documentTitle}</strong></div>`
    );
    const mainContent = document[documentTitle];

    // --- START: Handle DATE section separately ---
    if (mainContent["DATE"]) {
      const dateValue = mainContent["DATE"];
      const datePath = `${documentTitle}.DATE`;
      html.push(
        `<div class="document-line main-section" data-path="${datePath}" style="margin-left: 0px;">
            <h5><strong>DATE</strong></h5>
        </div>`
      );
      if (
        typeof dateValue === "object" &&
        dateValue !== null &&
        dateValue.content !== undefined
      ) {
        const contentPath = `${datePath}.content`;
        html.push(
          `<div class="document-line document-content" data-path="${contentPath}" style="margin-left: 40px;">
            <span data-value-path="${contentPath}">
                ${dateValue.content}
            </span>
          </div>`
        );
      }
    }
    // --- END: Handle DATE section separately ---

    // Process the rest of the sections, excluding DATE
    sectionOrder
      .filter((section) => section !== "DATE")
      .forEach((section) => {
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

    // Render section header
    if (isMainSection) {
      html.push(
        `<div class="document-line ${sectionClass}" data-path="${currentPath}" style="margin-left: ${marginLeft}px;">
        <h5><strong>${key}</strong></h5>
      </div>`
      );
    } else if (level > 0 && isNaN(Number(key))) {
      html.push(
        `<div class="document-line ${sectionClass}" data-path="${currentPath}" style="margin-left: ${marginLeft}px;">
        <h6><strong>${key}</strong></h6>
      </div>`
      );
    }

    // --- Only show selected option for options arrays ---
    if (
      typeof value === "object" &&
      value !== null &&
      Array.isArray(value.options) &&
      typeof value.selectedOption === "number"
    ) {
      const idx = value.selectedOption;
      const selected = value.options[idx];
      if (selected) {
        const optionPath = `${currentPath}.options.${idx}.option`;
        html.push(
          `<div class="document-line document-content" data-path="${currentPath}.options.${idx}" style="margin-left: ${
            marginLeft + 20
          }px;">
          <span data-value-path="${optionPath}">${selected.option || ""}</span>
        </div>`
        );
        Object.keys(selected).forEach((k) => {
          if (k !== "option" && typeof selected[k] === "string") {
            html.push(
              `<div class="document-line document-content" data-path="${currentPath}.options.${idx}.${k}" style="margin-left: ${
                marginLeft + 40
              }px;">
              <span data-value-path="${currentPath}.options.${idx}.${k}">${
                selected[k]
              }</span>
            </div>`
            );
          }
        });
      }
      return;
    }
    // --- END options array handling ---

    // --- Special: Render Schedule 1 Table as HTML Table ---
    if (
      key === "table" &&
      value.rows &&
      Array.isArray(value.rows) &&
      value.headers &&
      Array.isArray(value.headers)
    ) {
      html.push('<table class="services-table"><thead><tr>');
      value.headers.forEach((header) => {
        html.push(`<th>${header}</th>`);
      });
      html.push("</tr></thead><tbody>");
      value.rows.forEach((row, rowIndex) => {
        html.push("<tr>");
        row.forEach((cell, colIndex) => {
          const cellPath = `${currentPath}.rows.${rowIndex}.${colIndex}`;
          html.push(`<td data-value-path="${cellPath}">${cell}</td>`);
        });
        html.push("</tr>");
      });
      html.push("</tbody></table>");
      return;
    }
    // --- END Schedule 1 Table ---

    if (typeof value === "object" && value !== null) {
      let keys = Object.keys(value);

      keys.forEach((subKey) => {
        const subValue = value[subKey];
        const subMarginLeft = marginLeft + 20;

        // If subKey is numeric and subValue is an object with 'content', show only the content
        if (
          !isNaN(Number(subKey)) &&
          typeof subValue === "object" &&
          subValue !== null &&
          typeof subValue.content === "string"
        ) {
          html.push(
            `<div class="document-line document-content" data-path="${currentPath}.${subKey}.content" style="margin-left: ${subMarginLeft}px;">
              <span data-value-path="${currentPath}.${subKey}.content">${subValue.content}</span>
            </div>`
          );
        } else if (!isNaN(Number(subKey)) && typeof subValue === "string") {
          // For numeric keys with string value, show only the value
          html.push(
            `<div class="document-line document-content" data-path="${currentPath}.${subKey}" style="margin-left: ${subMarginLeft}px;">
              <span data-value-path="${currentPath}.${subKey}">${subValue}</span>
            </div>`
          );
        } else if (typeof subValue === "string") {
          if (subKey === "content") {
            // Only show the value, not "content:" label
            html.push(
              `<div class="document-line document-content" data-path="${currentPath}.${subKey}" style="margin-left: ${subMarginLeft}px;">
                <span data-value-path="${currentPath}.${subKey}">${subValue}</span>
              </div>`
            );
          } else if (isNaN(Number(subKey))) {
            // Only show label for non-numeric keys that are not "content"
            html.push(
              `<div class="document-line document-content" data-path="${currentPath}.${subKey}" style="margin-left: ${subMarginLeft}px;">
                <span data-value-path="${currentPath}.${subKey}"><strong>${subKey.replace(
                /_/g,
                " "
              )}</strong>: ${subValue}</span>
              </div>`
            );
          }
        } else if (Array.isArray(subValue)) {
          if (subValue.length > 0) {
            html.push(
              `<ul class="document-list" style="margin-left: ${
                subMarginLeft + 20
              }px;">`
            );
            subValue.forEach((item) => {
              if (typeof item === "string") {
                html.push(`<li>${item}</li>`);
              } else if (typeof item === "object") {
                if (item.option) {
                  html.push(`<li><strong>${item.option}</strong></li>`);
                  Object.keys(item).forEach((k) => {
                    if (k !== "option") {
                      if (Array.isArray(item[k])) {
                        html.push(`<ul style="margin-left: 20px;">`);
                        item[k].forEach((subitem) => {
                          if (typeof subitem === "string") {
                            html.push(`<li>${subitem}</li>`);
                          } else if (
                            typeof subitem === "object" &&
                            subitem.option
                          ) {
                            html.push(
                              `<li><strong>${subitem.option}</strong></li>`
                            );
                          }
                        });
                        html.push(`</ul>`);
                      } else if (typeof item[k] === "object") {
                        Object.keys(item[k]).forEach((subk) => {
                          html.push(
                            `<li><strong>${subk.replace(/_/g, " ")}:</strong> ${
                              item[k][subk]
                            }</li>`
                          );
                        });
                      } else if (typeof item[k] === "string") {
                        html.push(
                          `<li><strong>${k.replace(/_/g, " ")}:</strong> ${
                            item[k]
                          }</li>`
                        );
                      }
                    }
                  });
                } else {
                  Object.keys(item).forEach((k) => {
                    html.push(
                      `<li><strong>${k.replace(/_/g, " ")}:</strong> ${
                        item[k]
                      }</li>`
                    );
                  });
                }
              }
            });
            html.push(`</ul>`);
          }
        } else if (subValue && typeof subValue === "object") {
          processSection(subKey, subValue, level + 1, currentPath);
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
  // Get the right panel container instead of modal
  const container = document.getElementById("keyContainer");

  // DON'T modify the heading if there's already a save button
  const panelHeading = container.parentElement.querySelector("h2");
  const existingSaveButton =
    container.parentElement.querySelector("#saveDocBtn");

  // Clear existing content
  container.innerHTML = "";

  // Create all steps at once in the container
  let allQuestionsHTML = "";
  // Render ALL steps in documentQuestions
  Object.keys(documentQuestions).forEach((stepKey) => {
    const stepData = documentQuestions[stepKey];
    allQuestionsHTML += `
      <div class="questionnaire-section">
        <h3>${stepData.title}</h3>
        <div class="step-content">
          ${createQuestionsHTML(stepData)}
        </div>
      </div>
    `;
  });

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
        if (this.id === "assignorType" || this.id === "assigneeType") {
          handlePartyTypeChange(this);
        } else if (this.id === "considerationType") {
          handleConsiderationTypeChange(this);
        } else if (this.tagName === "SELECT") {
          handleFieldChange(this);
        } else {
          // Update document in real-time for other inputs
          updateDocumentWithFormData(formDataStore);
          updatePreview();
        }
      });
    });

  // Restore all saved form data for all steps
  Object.keys(documentQuestions).forEach((stepKey) => {
    restoreStepData(stepKey);
    registerHighlightEvents();
  });
}

// Save selection for inserted content

if (previewElem) {
  previewElem.addEventListener("mouseup", saveSelection);
  previewElem.addEventListener("keyup", saveSelection);
}

function saveSelection() {
  const sel = window.getSelection();
  if (sel.rangeCount > 0) savedRange = sel.getRangeAt(0);
}

function registerHighlightEvents() {
  document
    .querySelectorAll(
      "#keyContainer input, #keyContainer select, #keyContainer textarea"
    )
    .forEach((input) => {
      // Focus event (initial click)
      input.addEventListener("focus", function () {
        const fieldId = this.id;
        highlightDocumentSection(fieldId);
      });

      // Add INPUT event to maintain highlighting during editing
      input.addEventListener("input", function () {
        const fieldId = this.id;
        highlightDocumentSection(fieldId);
      });

      // Blur event (when leaving the field)
      input.addEventListener("blur", function () {
        setTimeout(() => {
          if (
            !document.activeElement ||
            !document.activeElement.hasAttribute("data-affects-path")
          ) {
            clearHighlights();
          }
        }, 100);
      });
    });
}

function createQuestionsHTML(stepData) {
  let html = "";

  // Add section identifier classes
  const isAssignorSection =
    stepData.title && stepData.title.includes("Assignor");
  const isAssigneeSection =
    stepData.title && stepData.title.includes("Assignee");
  const sectionClass = isAssignorSection
    ? "assignor-section"
    : isAssigneeSection
    ? "assignee-section"
    : "";

  for (const [key, data] of Object.entries(stepData)) {
    if (key === "title") continue;

    if (typeof data === "object" && !data.type) {
      // This is a group of questions - add section class
      const groupClass = isAssignorSection
        ? "assignor-group"
        : isAssigneeSection
        ? "assignee-group"
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
  // Only use prefix for party/consideration types
  let prefix = "";

  // Extract context from showIf (for party/consideration types only)
  const dataShowIf = data.showIf || "";
  if (dataShowIf.includes("assignorType=")) {
    const type = dataShowIf.split("=")[1].toLowerCase();
    prefix = `assignor_${type}_`;
  } else if (dataShowIf.includes("assigneeType=")) {
    const type = dataShowIf.split("=")[1].toLowerCase();
    prefix = `assignee_${type}_`;
  } else if (
    key === "assignorType" ||
    key === "assigneeType" ||
    key === "considerationType"
  ) {
    prefix = "";
  }

  // For all standard fields, use just the key as ID
  const fullId =
    key === "assignorType" ||
    key === "assigneeType" ||
    key === "considerationType"
      ? key
      : prefix
      ? prefix + key
      : key;

  // For all sublease fields, prefix is always "" so fullId === key

  // Get affected paths for data attribute
  const affectedPaths = documentPathMap[fullId]
    ? `data-affects-path="${documentPathMap[fullId].join(",")}"`
    : "";

  // Handle special cases for the type selectors themselves
  if (key === "assignorType" || key === "assigneeType") {
    return `
      <select id="${key}" onchange="handlePartyTypeChange(this)" ${affectedPaths}>
        <option value="">Select...</option>
        ${data.options
          .map((opt) => `<option value="${opt}">${opt}</option>`)
          .join("")}
      </select>
    `;
  } else if (key === "considerationType") {
    return `
      <select id="${key}" onchange="handleConsiderationTypeChange(this)" ${affectedPaths}>
        <option value="">Select...</option>
        ${data.options
          .map((opt) => `<option value="${opt}">${opt}</option>`)
          .join("")}
      </select>
    `;
  } else if (data.type === "select") {
    return `
      <select id="${key}" onchange="handleFieldChange(this)" ${affectedPaths}>
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
      return `<textarea id="${key}" class="form-textarea" data-original-key="${key}" ${affectedPaths}>${
        data.default || ""
      }</textarea>`;
    case "date":
      return `<input type="date" id="${key}" data-original-key="${key}" ${affectedPaths}>`;
    default:
      return `<input type="text" id="${key}" data-original-key="${key}" value="${
        data.default || ""
      }" ${affectedPaths}>`;
  }
}

function handleConsiderationTypeChange(selectElement) {
  // Save the selected value
  formDataStore[selectElement.id] = selectElement.value;

  // Show/hide the appropriate field based on selection
  document
    .querySelectorAll(`[data-show-if="${selectElement.id}"]`)
    .forEach((field) => {
      const showValue = field.getAttribute("data-show-value");
      field.style.display =
        showValue === selectElement.value ? "block" : "none";
    });

  // Update document with the selected consideration type
  updateDocumentWithFormData(formDataStore);
  updatePreview();

  // Highlight the affected sections
  highlightDocumentSection(selectElement.id);
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

  // Highlight affected sections
  highlightDocumentSection(element.id);
}

function saveStepData(stepNumber) {
  document.querySelectorAll("input, select, textarea").forEach((input) => {
    if (input.id && input.value) {
      formDataStore[input.id] = input.value;
    }
  });
}

function restoreStepData(stepNumber) {
  // Restore all saved values for this step
  document.querySelectorAll("input, select, textarea").forEach((input) => {
    if (input.id && formDataStore[input.id]) {
      input.value = formDataStore[input.id];

      // Handle conditional field visibility
      if (input.tagName === "SELECT") {
        // For party type selectors, use the specific handler
        if (input.id === "assignorType" || input.id === "assigneeType") {
          handlePartyTypeChange(input);
        } else if (input.id === "considerationType") {
          handleConsiderationTypeChange(input);
        } else {
          handleFieldChange(input);
        }
      }
    }
  });
}

function submitQuestionnaire() {
  try {
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
  } catch (error) {
    console.error("Error submitting questionnaire:", error);
    alert("There was an error saving the document. Please try again.");
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "*[Date]*";
  // Assume dateStr is in format yyyy-mm-dd
  const [year, month, day] = dateStr.split("-");
  return `${day}-${month}-${year}`;
}

// Simplified handlePartyTypeChange function - no need to manually reset document
function handlePartyTypeChange(selectElement) {
  const isAssignor = selectElement.id === "assignorType";
  const isAssignee = selectElement.id === "assigneeType";
  const selectedType = selectElement.value;

  if (!selectedType) return;

  // Clear previous values for other types from formDataStore
  const prefix = isAssignor ? "assignor_" : "assignee_";
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

  // Add highlighting functionality
  // First, highlight the section affected by this dropdown
  highlightDocumentSection(selectElement.id);

  // Then focus on the first visible field for that party type
  // This will trigger additional highlighting for that field
  setTimeout(() => {
    // Find all visible input fields for this party type
    const visibleFields = document.querySelectorAll(
      `[data-show-if="${selectElement.id}"][data-show-value="${selectedType}"]:not([style*="display: none"]) input, 
       [data-show-if="${selectElement.id}"][data-show-value="${selectedType}"]:not([style*="display: none"]) textarea,
       [data-show-if="${selectElement.id}"][data-show-value="${selectedType}"]:not([style*="display: none"]) select`
    );

    // Focus the first one if any exist
    if (visibleFields.length > 0) {
      visibleFields[0].focus();
    }
  }, 200); // Slight delay to ensure DOM is updated
}

/**
 * Maps form data to document structure
 * @param {Object} flatDoc - Flattened document object
 * @param {Object} formData - The form data
 * @return {Object} Updated flat document
 */
/**
 * Replace the first *[ ... ]* in the template with the answer (no boxes).
 */
/**
 * Replace the Nth *[ ... ]* in the template with the answer (no boxes).
 * @param {string} template
 * @param {string} answer
 * @param {number} boxIndex - zero-based index of the box to fill
 */
function fillAndRemoveNthSquareBox(template, answer, boxIndex = 0) {
  if (!template) return template;
  let count = 0;
  return template.replace(/\*\[[^\]]*\]\*/g, (box) => {
    if (count === boxIndex) {
      count++;
      return answer || "";
    }
    count++;
    return box;
  });
}
function applyFormDataToFlatDocument(flatDoc, formData) {
  const updatedFlatDoc = { ...flatDoc };

  // 1. Group all fields by their realPath (without |N)
  const pathGroups = {};
  Object.keys(documentPathMap).forEach((fieldId) => {
    documentPathMap[fieldId].forEach((path) => {
      let boxIndex = 0;
      let realPath = path;
      let afterBetween = false;
      if (/\|afterBetween$/.test(path)) {
        realPath = path.split("|")[0];
        afterBetween = true;
      } else if (/\|\d+$/.test(path)) {
        const parts = path.split("|");
        realPath = parts[0];
        boxIndex = parseInt(parts[1], 10);
      }
      if (!pathGroups[realPath]) pathGroups[realPath] = [];
      if (afterBetween) {
        pathGroups[realPath].afterBetween = fieldId;
      } else {
        pathGroups[realPath][boxIndex] = fieldId;
      }
    });
  });

  // 2. For each template with boxes, fill all boxes at once, removing the brackets
  Object.keys(pathGroups).forEach((realPath) => {
    let template = flatDoc[realPath];
    if (typeof template === "string" && /\*\[[^\]]*\]\*/.test(template)) {
      let count = 0;
      template = template.replace(/\*\[[^\]]*\]\*/g, (box) => {
        const fieldId = pathGroups[realPath][count];
        const answer =
          fieldId && formData[fieldId] !== undefined && formData[fieldId] !== ""
            ? formData[fieldId]
            : box;
        count++;
        return answer !== box ? answer : box;
      });
    }
    // Special handling for backgroundContent: insert after "between:"
    if (pathGroups[realPath].afterBetween) {
      const clause = formData[pathGroups[realPath].afterBetween] || "";
      // Insert after "between:" (with a space if needed)
      template = template.replace(/(between:)/i, `$1 ${clause}`);
    }
    updatedFlatDoc[realPath] = template;
  });

  // 3. For fields that are not part of a multi-box template, fill as usual
  Object.keys(formData).forEach((fieldId) => {
    const paths = documentPathMap[fieldId];
    if (paths) {
      paths.forEach((path) => {
        let realPath = path.split("|")[0];
        // If no square box, just overwrite the value
        if (
          !(
            flatDoc[realPath] &&
            typeof flatDoc[realPath] === "string" &&
            /\*\[[^\]]*\]\*/.test(flatDoc[realPath])
          )
        ) {
          updatedFlatDoc[realPath] = formData[fieldId];
        }
      });
    }
  });

  return updatedFlatDoc;
}
// n for updating document with form data (using flatten/unflatten approach)
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

// Add this function near the enableEditing function

/**
 * Toggles the edit mode on and off for the document preview
 */
function toggleEditMode() {
  const previewElem = document.getElementById("documentPreview");
  const toggle = document.getElementById("editModeToggle");

  if (!previewElem) return;

  if (toggle.checked) {
    // Enable editing mode
    previewElem.contentEditable = true;
    previewElem.classList.add("editable");
    // Display a notification
    showNotification("Edit mode enabled");
  } else {
    // Disable editing mode
    previewElem.contentEditable = false;
    previewElem.classList.remove("editable");
    showNotification("Edit mode disabled");
  }
}

/**
 * Display a temporary notification message
 * @param {string} message - The message to display
 */
function showNotification(message) {
  const notification = document.createElement("div");
  notification.className = "notification";
  notification.textContent = message;
  notification.style.position = "fixed";
  notification.style.bottom = "20px";
  notification.style.right = "20px";
  notification.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
  notification.style.color = "white";
  notification.style.padding = "10px 15px";
  notification.style.borderRadius = "4px";
  notification.style.zIndex = "1000";

  document.body.appendChild(notification);

  // Remove the notification after 3 seconds
  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transition = "opacity 0.5s";
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 500);
  }, 3000);
}

/* --- Functions for Adding Key-Value Pair under ASSIGNMENT --- */
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
    !window.currentDocument[documentTitle]["ASSIGNMENT"]
  ) {
    if (!window.currentDocument[documentTitle]) {
      window.currentDocument[documentTitle] = {};
    }
    window.currentDocument[documentTitle]["ASSIGNMENT"] = {};
  }

  window.currentDocument[documentTitle]["ASSIGNMENT"][key] = { content: value };
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
    window.currentDocument[documentTitle]["ASSIGNMENT"]
  ) {
    const assignmentObj = window.currentDocument[documentTitle]["ASSIGNMENT"];
    Object.keys(assignmentObj).forEach(function (key) {
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
    !window.currentDocument[documentTitle]["ASSIGNMENT"]
  ) {
    alert("ASSIGNMENT section does not exist.");
    return;
  }

  const assignmentObj = window.currentDocument[documentTitle]["ASSIGNMENT"];
  if (!assignmentObj[parentKey]) {
    assignmentObj[parentKey] = {};
  }

  assignmentObj[parentKey][subKey] = { content: subValue };
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
    if (currentPath.endsWith("ASSIGNMENT")) {
      const actualKeys = Object.keys(section);
      keys = assignmentSectionOrder
        .filter((k) => actualKeys.includes(k))
        .concat(actualKeys.filter((k) => !assignmentSectionOrder.includes(k)));
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
          path.startsWith("Assignment of Copyright.DATE") ||
          path.startsWith("Assignment of Copyright.PARTIES");

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
/**
 * Enables inline editing of a field identified by its data-path.
 */
function editValue(path) {
  // Find the input (or textarea) by its data-value-path
  const input = document.querySelector(`[data-value-path="${path}"]`);
  // Buttons keyed by matching data-path attribute
  const editButton = document.querySelector(
    `button.edit-button[data-path="${path}"]`
  );
  const saveButton = document.querySelector(
    `button.save-button[data-path="${path}"]`
  );
  const aiButton = document.querySelector(
    `button.ai-button[data-path="${path}"]`
  );

  if (!input) return;

  // Make the field editable
  input.readOnly = false;
  input.classList.remove("readonly");
  input.focus();

  // Hide the Edit and AI buttons, enable Save
  if (editButton) editButton.style.display = "none";
  if (aiButton) aiButton.style.display = "none";
  if (saveButton) saveButton.disabled = false;

  // Restore any previously saved text selection if present
  if (savedRange) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange);
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

    // Update the preview display
    updatePreview();

    // Highlight the updated section
    highlightDocumentSection(path);

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

function downloadWordDocx() {
  // Clone the content to avoid modifying the original
  const previewElem = document.getElementById("documentPreview");
  const contentClone = previewElem.cloneNode(true);

  // Clean up content before converting
  cleanupForDocx(contentClone);

  const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Document</title>
            <style>
                @page {
                    margin: 1in;
                }
                body {
                    font-family: Verdana, sans-serif;
                    font-size: 10pt;
                    line-height: 1.3;
                    color: #000;
                }
                
                /* Document title */
                .document-title {
                    font-size: 14pt;
                    font-weight: bold;
                    margin-bottom: 24pt;
                }
                .document-title strong {
                    font-size: 14pt;
                }
                
                /* Main sections (DATE, PARTIES, etc.) */
                .main-section h5 {
                    font-size: 12pt;
                    font-weight: bold;
                    margin-top: 18pt;
                    margin-bottom: 12pt;
                    text-transform: uppercase;
                }
                .main-section h5 strong {
                    font-size: 12pt;
                }
                
                /* Sub-sections */
                .sub-section h6 {
                    font-size: 10pt;
                    font-weight: bold;
                    margin-top: 12pt;
                    margin-bottom: 6pt;
                }
                .sub-section h6 strong {
                    font-size: 10pt;
                }
                
                /* Content paragraphs */
                .document-content {
                    margin-bottom: 6pt;
                    font-size: 10pt;
                }
                
                /* Bold elements in content */
                .document-content strong {
                    font-size: 10pt;
                }
                
                /* Remove labels like "content:" */
                span[data-value-path] strong:first-child:after {
                    content: " ";
                }
                
                /* Legal clause spacing and indentation */
                .document-line {
                    margin-left: 0 !important;
                }
                
                /* Signature section typically comes near the end */
                .main-section:nth-last-of-type(2) {
                    margin-top: 24pt;
                }
                
                /* Schedule/appendix typically comes last */
                .main-section:last-of-type {
                    page-break-before: always;
                    margin-top: 0;
                }
                
                /* Remove unwanted elements and styling */
                .highlighted, .highlighted-section {
                    background-color: transparent !important;
                    box-shadow: none !important;
                    border-left: none !important;
                    animation: none !important;
                }
                
                /* Additional spacing for signature blocks */
                [data-value-path*="signature"] {
                    margin-top: 12pt;
                    margin-bottom: 12pt;
                }
            </style>
        </head>
        <body>
            ${contentClone.innerHTML}
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

// Helper function to clean up content for DOCX
function cleanupForDocx(element) {
  // 1. Remove any highlighting classes
  const highlighted = element.querySelectorAll(
    ".highlighted, .highlighted-section"
  );
  highlighted.forEach((el) => {
    el.classList.remove("highlighted");
    el.classList.remove("highlighted-section");
  });

  // 2. Fix heading format (remove ##### and other markdown-like symbols)
  const headings = element.querySelectorAll("h1, h2, h3, h4, h5, h6");
  headings.forEach((heading) => {
    heading.textContent = heading.textContent.replace(/^#+\s*/, "");
  });

  // 3. Remove labels like "content:", "option1:", etc.
  const spans = element.querySelectorAll("span[data-value-path]");
  spans.forEach((span) => {
    const text = span.textContent;
    const labelMatch = text.match(/^([a-zA-Z0-9]+):\s*(.*)/);
    if (
      labelMatch &&
      labelMatch[1] &&
      (labelMatch[1].toLowerCase() === "content" ||
        labelMatch[1].toLowerCase().includes("option"))
    ) {
      span.textContent = labelMatch[2];
    }
  });

  // 4. Set consistent margins and indentation
  const sections = element.querySelectorAll(".document-line");
  sections.forEach((section) => {
    section.style.marginLeft = "0";
  });

  // 5. Fix numbering format (add proper indentation for numbered clauses)
  const contentItems = element.querySelectorAll(".document-content");
  contentItems.forEach((item) => {
    // Check if this is a numbered clause (like "4.1:", "5.2:", etc.)
    const text = item.textContent;
    const numberMatch = text.match(/^(\d+\.\d+):\s*(.*)/);
    if (numberMatch) {
      item.style.paddingLeft = "0.25in";
      item.style.textIndent = "-0.25in";
    }
  });

  // 6. Apply consistent font sizes
  // Main title
  const titleElements = element.querySelectorAll(".document-title");
  titleElements.forEach((el) => {
    el.style.fontSize = "14pt";
    const strongs = el.querySelectorAll("strong");
    strongs.forEach((s) => (s.style.fontSize = "14pt"));
  });

  // Main sections
  const mainSections = element.querySelectorAll(".main-section h5");
  mainSections.forEach((el) => {
    el.style.fontSize = "12pt";
    const strongs = el.querySelectorAll("strong");
    strongs.forEach((s) => (s.style.fontSize = "12pt"));
  });

  // Sub-sections and content - all 10pt
  const subSections = element.querySelectorAll(
    ".sub-section h6, .document-content"
  );
  subSections.forEach((el) => {
    el.style.fontSize = "10pt";
    const strongs = el.querySelectorAll("strong");
    strongs.forEach((s) => (s.style.fontSize = "10pt"));
  });
}

/* --- Expose functions to global scope --- */
// Make all functions available globally for HTML event handlers
window.openAddKeyValueDialog = openAddKeyValueDialog;
window.closeAddKeyValueDialog = closeAddKeyValueDialog;
window.addKeyValuePair = addKeyValuePair;
window.openAddSubKeyValueDialog = openAddSubKeyValueDialog;
window.closeAddSubKeyValueDialog = closeAddSubKeyValueDialog;
window.addSubKeyValuePair = addSubKeyValuePair;
window.enableEditing = enableEditing;
window.openInsertDialog = openInsertDialog;
window.closeInsertDialog = closeInsertDialog;
window.insertNewContent = insertNewContent;
window.editValue = editValue;
window.saveValue = saveValue;
window.downloadWordDocx = downloadWordDocx;
window.showQuestionnaire = showQuestionnaire;
window.closeQuestionnaireModal = closeQuestionnaireModal;
window.submitQuestionnaire = submitQuestionnaire;
window.handleFieldChange = handleFieldChange;
window.handleConsiderationTypeChange = handleConsiderationTypeChange;
window.handlePartyTypeChange = handlePartyTypeChange;
window.updateValueWithAI = updateValueWithAI;
window.highlightDocumentSection = highlightDocumentSection;
window.clearHighlights = clearHighlights;
window.openEditDialog = openEditDialog;
window.closeEditDialog = closeEditDialog;
window.submitAIEditRequest = submitAIEditRequest;
window.toggleEditMode = toggleEditMode;
