// Document order configuration
const sectionOrder = [
  "DATE",
  "PARTIES",
  "BACKGROUND",
  "AGREEMENT",
  "EXECUTION",
  "SCHEDULE 1",
  "SCHEDULE 2",
];

const agreementSectionOrder = [
  "2. Definitions",
  "3. Term",
  "4. Non-exclusive distributorship",
  "5. Distributor obligations",
  "6. Supplier obligations",
  "7. Order procedure",
  "8. No assignment of Intellectual Property Rights",
  "9. Charges",
  "10. Payments",
  "11. Confidentiality obligations",
  "12. Warranties",
  "13. Supplier Indemnity",
  "14. Limitations and exclusions of liability",
  "15. Force Majeure Event",
  "16. Termination",
  "17. Effects of termination",
  "18. Notices",
  "19. General",
  "20. Interpretation",
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

// Predefined questions for document - UPDATED with more comprehensive coverage
const documentQuestions = {
  step1: {
    title: "Date and Party Type",
    date: {
      question: "Enter the date of agreement",
      type: "date",
    },
  },
  step2: {
    title: "Supplier Details",
    supplierType: {
      question: "Select type of Supplier",
      type: "select",
      options: ["Individual", "Company", "Partnership"],
    },
    individual: {
      name: {
        question: "Enter individual's full name",
        type: "text",
        showIf: "supplierType=Individual",
      },
      address: {
        question: "Enter individual's address",
        type: "text",
        showIf: "supplierType=Individual",
      },
    },
    company: {
      name: {
        question: "Enter company name",
        type: "text",
        showIf: "supplierType=Company",
      },
      regNumber: {
        question: "Enter registration number",
        type: "text",
        showIf: "supplierType=Company",
      },
      jurisdiction: {
        question: "Enter jurisdiction of incorporation",
        type: "text",
        default: "England and Wales",
        showIf: "supplierType=Company",
      },
      address: {
        question: "Enter registered office address",
        type: "text",
        showIf: "supplierType=Company",
      },
      signatory: {
        question: "Enter name of person signing on behalf of company",
        type: "text",
        showIf: "supplierType=Company",
      },
    },
    partnership: {
      name: {
        question: "Enter partnership name",
        type: "text",
        showIf: "supplierType=Partnership",
      },
      jurisdiction: {
        question: "Enter jurisdiction of the partnership",
        type: "text",
        default: "England and Wales",
        showIf: "supplierType=Partnership",
      },
      address: {
        question: "Enter principal place of business",
        type: "text",
        showIf: "supplierType=Partnership",
      },
      signatory: {
        question: "Enter name of partner signing on behalf of partnership",
        type: "text",
        showIf: "supplierType=Partnership",
      },
    },
  },
  step3: {
    title: "Distributor Details",
    distributorType: {
      question: "Select type of Distributor",
      type: "select",
      options: ["Individual", "Company", "Partnership"],
    },
    individual: {
      name: {
        question: "Enter individual's full name",
        type: "text",
        showIf: "distributorType=Individual",
      },
      address: {
        question: "Enter individual's address",
        type: "text",
        showIf: "distributorType=Individual",
      },
    },
    company: {
      name: {
        question: "Enter company name",
        type: "text",
        showIf: "distributorType=Company",
      },
      regNumber: {
        question: "Enter registration number",
        type: "text",
        showIf: "distributorType=Company",
      },
      jurisdiction: {
        question: "Enter jurisdiction of incorporation",
        type: "text",
        default: "England and Wales",
        showIf: "distributorType=Company",
      },
      address: {
        question: "Enter registered office address",
        type: "text",
        showIf: "distributorType=Company",
      },
      signatory: {
        question: "Enter name of person signing on behalf of company",
        type: "text",
        showIf: "distributorType=Company",
      },
    },
    partnership: {
      name: {
        question: "Enter partnership name",
        type: "text",
        showIf: "distributorType=Partnership",
      },
      jurisdiction: {
        question: "Enter jurisdiction of the partnership",
        type: "text",
        default: "England and Wales",
        showIf: "distributorType=Partnership",
      },
      address: {
        question: "Enter principal place of business",
        type: "text",
        showIf: "distributorType=Partnership",
      },
      signatory: {
        question: "Enter name of partner signing on behalf of partnership",
        type: "text",
        showIf: "distributorType=Partnership",
      },
    },
  },
  step4: {
    title: "Background",
    supplierBackground: {
      question: "Explain background from the Supplier's perspective",
      type: "textarea",
    },
    distributorBackground: {
      question: "Explain background from the Distributor's perspective",
      type: "textarea",
    },
  },
  step5: {
    title: "Agreement Term and Territory",
    termType: {
      question: "Select the term type for the agreement",
      type: "select",
      options: ["Indefinite", "Specific Date", "Specific Event"],
    },
    termDate: {
      question: "Enter the specific termination date",
      type: "date",
      showIf: "termType=Specific Date",
    },
    termEvent: {
      question: "Describe the termination event",
      type: "text",
      showIf: "termType=Specific Event",
    },
    territory: {
      question: "Specify the territory for this distribution agreement",
      type: "text",
    },
    reservedTerritory: {
      question: "Specify the reserved territory (if applicable)",
      type: "text",
    },
    productDefinitionType: {
      question: "How would you like to define the products?",
      type: "select",
      options: ["Specify Products", "Any Supplier Products", "Reference Schedule"],
    },
    productsList: {
      question: "Identify the specific products",
      type: "textarea",
      showIf: "productDefinitionType=Specify Products",
    },
  },
  step6: {
    title: "Financial Terms",
    vatOption: {
      question: "Choose how VAT is handled in prices",
      type: "select",
      options: ["Inclusive of VAT", "Exclusive of VAT"],
    },
    paymentTiming: {
      question: "When should payment be made after invoicing? (days)",
      type: "text",
      default: "30",
    },
    paymentMethods: {
      question: "Specify acceptable payment methods",
      type: "text",
      default: "bank transfer",
    },
    invoiceTiming: {
      question: "When should the Supplier issue invoices?",
      type: "select",
      options: ["On supply of Products", "On agreement of Order", "Other (specify)"],
    },
    invoiceOtherTiming: {
      question: "Specify other invoice timing",
      type: "text",
      showIf: "invoiceTiming=Other (specify)",
    },
  },
  step7: {
    title: "Schedules",
    productDetails: {
      question: "Provide details of products for Schedule 1",
      type: "textarea",
    },
    chargeDetails: {
      question: "Specify charges for products in Schedule 1",
      type: "textarea",
    },
    deliveryTerms: {
      question: "Specify delivery terms for Schedule 2",
      type: "textarea",
    },
    qualityRequirements: {
      question: "Specify quality requirements for Schedule 2",
      type: "textarea",
    },
    riskAndTitle: {
      question: "Specify when risk and title pass to the distributor",
      type: "textarea",
    },
    returnsAndReplacements: {
      question: "Specify terms for returns and replacements",
      type: "textarea",
    },
  },
};

// Updated documentPathMap with consistent document title
const normalizedDocTitle = "Non-exclusive distribution agreement";

const documentPathMap = {
  // Date field
  "date": [`${normalizedDocTitle}.DATE.content`],

  // Party types
  "supplierType": [`${normalizedDocTitle}.PARTIES.1.content`],
  "distributorType": [`${normalizedDocTitle}.PARTIES.2.content`],

  // Supplier fields (Individual)
  "supplier_individual_name": [
    `${normalizedDocTitle}.PARTIES.1.content`,
    `${normalizedDocTitle}.EXECUTION.signature_blocks.supplier`
  ],
  "supplier_individual_address": [`${normalizedDocTitle}.PARTIES.1.content`],

  // Supplier fields (Company)
  "supplier_company_name": [
    `${normalizedDocTitle}.PARTIES.1.content`,
    `${normalizedDocTitle}.EXECUTION.signature_blocks.supplier`
  ],
  "supplier_company_regNumber": [`${normalizedDocTitle}.PARTIES.1.content`],
  "supplier_company_jurisdiction": [`${normalizedDocTitle}.PARTIES.1.content`],
  "supplier_company_address": [`${normalizedDocTitle}.PARTIES.1.content`],
  "supplier_company_signatory": [`${normalizedDocTitle}.EXECUTION.signature_blocks.supplier`],

  // Supplier fields (Partnership)
  "supplier_partnership_name": [
    `${normalizedDocTitle}.PARTIES.1.content`,
    `${normalizedDocTitle}.EXECUTION.signature_blocks.supplier`
  ],
  "supplier_partnership_jurisdiction": [`${normalizedDocTitle}.PARTIES.1.content`],
  "supplier_partnership_address": [`${normalizedDocTitle}.PARTIES.1.content`],
  "supplier_partnership_signatory": [`${normalizedDocTitle}.EXECUTION.signature_blocks.supplier`],

  // Distributor fields (Individual)
  "distributor_individual_name": [
    `${normalizedDocTitle}.PARTIES.2.content`,
    `${normalizedDocTitle}.EXECUTION.signature_blocks.distributor`
  ],
  "distributor_individual_address": [`${normalizedDocTitle}.PARTIES.2.content`],

  // Distributor fields (Company)
  "distributor_company_name": [
    `${normalizedDocTitle}.PARTIES.2.content`,
    `${normalizedDocTitle}.EXECUTION.signature_blocks.distributor`
  ],
  "distributor_company_regNumber": [`${normalizedDocTitle}.PARTIES.2.content`],
  "distributor_company_jurisdiction": [`${normalizedDocTitle}.PARTIES.2.content`],
  "distributor_company_address": [`${normalizedDocTitle}.PARTIES.2.content`],
  "distributor_company_signatory": [`${normalizedDocTitle}.EXECUTION.signature_blocks.distributor`],

  // Distributor fields (Partnership)
  "distributor_partnership_name": [
    `${normalizedDocTitle}.PARTIES.2.content`,
    `${normalizedDocTitle}.EXECUTION.signature_blocks.distributor`
  ],
  "distributor_partnership_jurisdiction": [`${normalizedDocTitle}.PARTIES.2.content`],
  "distributor_partnership_address": [`${normalizedDocTitle}.PARTIES.2.content`],
  "distributor_partnership_signatory": [`${normalizedDocTitle}.EXECUTION.signature_blocks.distributor`],

  // Background fields
  "supplierBackground": [`${normalizedDocTitle}.BACKGROUND.1.content`],
  "distributorBackground": [`${normalizedDocTitle}.BACKGROUND.2.content`],
  
  // Agreement Term and Territory
  "termType": [`${normalizedDocTitle}.AGREEMENT.3. Term.3.2.content`],
  "termDate": [`${normalizedDocTitle}.AGREEMENT.3. Term.3.2.content`],
  "termEvent": [`${normalizedDocTitle}.AGREEMENT.3. Term.3.2.content`],
  "territory": [`${normalizedDocTitle}.AGREEMENT.2. Definitions.2.1.Territory`],
  "reservedTerritory": [`${normalizedDocTitle}.AGREEMENT.2. Definitions.2.1.Reserved Territory`],
  "productDefinitionType": [`${normalizedDocTitle}.AGREEMENT.2. Definitions.2.1.Products`],
  "productsList": [`${normalizedDocTitle}.AGREEMENT.2. Definitions.2.1.Products.option1`],
  
  // Financial Terms
  "vatOption": [`${normalizedDocTitle}.AGREEMENT.9. Charges.9.2.options`],
  "paymentTiming": [`${normalizedDocTitle}.AGREEMENT.10. Payments.10.2.content`],
  "paymentMethods": [`${normalizedDocTitle}.AGREEMENT.10. Payments.10.3.content`],
  "invoiceTiming": [`${normalizedDocTitle}.AGREEMENT.10. Payments.10.1.content`],
  "invoiceOtherTiming": [`${normalizedDocTitle}.AGREEMENT.10. Payments.10.1.content`],
  
  // Schedules
  "productDetails": [`${normalizedDocTitle}.SCHEDULE 1.DISTRIBUTION PARTICULARS.1. Products.content`],
  "chargeDetails": [`${normalizedDocTitle}.SCHEDULE 1.DISTRIBUTION PARTICULARS.2. Charges.content`],
  "deliveryTerms": [`${normalizedDocTitle}.SCHEDULE 2.TERMS AND CONDITIONS OF SUPPLY.1. Delivery.content`],
  "qualityRequirements": [`${normalizedDocTitle}.SCHEDULE 2.TERMS AND CONDITIONS OF SUPPLY.2. Quality.content`],
  "riskAndTitle": [`${normalizedDocTitle}.SCHEDULE 2.TERMS AND CONDITIONS OF SUPPLY.3. Risk and Title.content`],
  "returnsAndReplacements": [`${normalizedDocTitle}.SCHEDULE 2.TERMS AND CONDITIONS OF SUPPLY.4. Returns and Replacements.content`]
};

/**
 * Highlights document sections affected by a specific form field
 * and scrolls to the highlighted element after a brief delay
 * @param {string} fieldId - The ID of the form field being focused
 */
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

function convertToHtml(document) {
  let html = [];
  const documentTitle = Object.keys(document)[0];
  if (documentTitle) {
    // Use normalized document title for consistency
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
    const marginLeft = level * 20;

    // ——— LEAF ONLY: { content: "…" } — render raw and stop before printing any header ———
    if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      Object.keys(value).length === 1 &&
      value.content !== undefined
    ) {
      html.push(
        `<div class="document-line document-content"
              data-path="${currentPath}.content"
              style="margin-left: ${marginLeft}px;">
         <span data-value-path="${currentPath}.content">
           ${value.content}
         </span>
       </div>`
      );
      return;
    }

    // ——— NOW the normal section-heading logic ———
    const isMainSection = sectionOrder.includes(key);
    const sectionClass = isMainSection ? "main-section" : "sub-section";
    if (isMainSection) {
      html.push(
        `<div class="document-line ${sectionClass}"
              data-path="${currentPath}"
              style="margin-left: ${marginLeft}px;">
         <h5><strong>${key}</strong></h5>
       </div>`
      );
    } else {
      html.push(
        `<div class="document-line ${sectionClass}"
              data-path="${currentPath}"
              style="margin-left: ${marginLeft + 20}px;">
         <h6><strong>${key}</strong></h6>
       </div>`
      );
    }

    // …and then the rest of your keys.forEach(subKey) logic…
    if (typeof value === "object" && value !== null) {
      let keys = Object.keys(value);
      // Special handling for the "AGREEMENT" section
      if (key === "AGREEMENT") {
        const actualKeys = Object.keys(value);
        keys = agreementSectionOrder
          .filter((k) => actualKeys.includes(k))
          .concat(actualKeys.filter((k) => !agreementSectionOrder.includes(k)));
      }

      keys.forEach((subKey) => {
        const subValue = value[subKey];
        const subPath = `${currentPath}.${subKey}`;
        const indent = (level + 1) * 20;

        // 1) Always hide "content" keys
        if (subKey === "content") {
          html.push(
            `<div class="document-line document-content"
                  data-path="${subPath}"
                  style="margin-left: ${indent}px;">
               <span data-value-path="${subPath}">
                 ${subValue}
               </span>
             </div>`
          );
          return;
        }

        // 2) Always hide "options" labels
        if (subKey === "options" && Array.isArray(subValue)) {
          html.push(
            `<div class="document-line document-content"
                  data-path="${subPath}"
                  style="margin-left: ${indent}px;">
               <span data-value-path="${subPath}">
                 ${subValue.join(" OR ")}
               </span>
             </div>`
          );
          return;
        }

        // 3) If it's a nested object (e.g. numbered clauses)
        if (typeof subValue === "object" && subValue !== null) {
          // If it has its own .content, render that raw
          if (subValue.content !== undefined) {
            html.push(
              `<div class="document-line document-content"
                    data-path="${subPath}.content"
                    style="margin-left: ${indent}px;">
                 <span data-value-path="${subPath}.content">
                   ${subValue.content}
                 </span>
               </div>`
            );
            // then you can still walk any other sub-props (but skip content/options)
            Object.entries(subValue).forEach(([k, v]) => {
              if (k !== "content" && k !== "options") {
                // ...render v under k if you really need to…
              }
            });
          }
          else {
            // deeper nesting
            processSection(subKey, subValue, level + 1, currentPath);
          }
          return;
        }

        // 4) Any plain strings or numbers (not named "content")
        html.push(
          `<div class="document-line document-content"
                data-path="${subPath}"
                style="margin-left: ${indent}px;">
             <span>
               <strong>${subKey}:</strong>
               <span data-value-path="${subPath}">${subValue}</span>
             </span>
           </div>`
        );
      });
    }
  }
}

// Add the missing updatePreview function
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
  const existingSaveButton = container.parentElement.querySelector("#saveDocBtn");

  // Clear existing content
  container.innerHTML = "";

  // Create all steps at once in the container
  let allQuestionsHTML = "";
  for (let stepNumber = 1; stepNumber <= Object.keys(documentQuestions).length; stepNumber++) {
    const stepData = documentQuestions[`step${stepNumber}`];
    if (stepData) {
      allQuestionsHTML += `
        <div class="questionnaire-section">
          <h3>${stepData.title}</h3>
          <div class="step-content">
            ${createQuestionsHTML(stepData)}
          </div>
        </div>
      `;
    }
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
        if (this.id === "supplierType" || this.id === "distributorType") {
          handlePartyTypeChange(this);
        } else if (this.id === "termType") {
          handleTermTypeChange(this);
        } else if (this.id === "productDefinitionType") {
          handleProductDefinitionChange(this);
        } else if (this.id === "invoiceTiming") {
          handleInvoiceTimingChange(this);
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
  for (let step = 1; step <= Object.keys(documentQuestions).length; step++) {
    restoreStepData(step);
  }
  
  // Register highlighting events
  registerHighlightEvents();
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

  // Add section identifier classes based on the title
  const isSupplierSection = stepData.title && stepData.title.includes("Supplier");
  const isDistributorSection = stepData.title && stepData.title.includes("Distributor");
  const sectionClass = isSupplierSection
    ? "supplier-section"
    : isDistributorSection
    ? "distributor-section"
    : "";

  for (const [key, data] of Object.entries(stepData)) {
    if (key === "title") continue;

    if (typeof data === "object" && !data.type) {
      // This is a group of questions - add section class
      const groupClass = isSupplierSection
        ? "supplier-group"
        : isDistributorSection
        ? "distributor-group"
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
    visibilityAttr = `data-show-if="${condition}" data-show-value="${value}"`;
  }

  return `
    <div class="question-field ${sectionClass}" ${visibilityAttr}>
      <label>${data.question}</label>
      ${createInputElement(key, data)}
    </div>
  `;
}

function createInputElement(key, data) {
  // Determine which section and type we're in based on showIf
  let prefix = "";

  // Extract context from showIf
  const dataShowIf = data.showIf || "";
  if (dataShowIf.includes("supplierType=")) {
    const type = dataShowIf.split("=")[1].toLowerCase();
    prefix = `supplier_${type}_`;
  } else if (dataShowIf.includes("distributorType=")) {
    const type = dataShowIf.split("=")[1].toLowerCase();
    prefix = `distributor_${type}_`;
  } else if (key === "supplierType" || key === "distributorType" || 
             key === "termType" || key === "productDefinitionType" ||
             key === "invoiceTiming") {
    // No prefix for the type selectors themselves
    prefix = "";
  }

  // Create full ID
  const fullId = prefix ? prefix + key : key;

  // Get affected paths for data attribute
  const affectedPaths = documentPathMap[fullId]
    ? `data-affects-path="${documentPathMap[fullId].join(",")}"`
    : "";

  // Handle special cases for the type selectors themselves
  if (key === "supplierType" || key === "distributorType") {
    return `
      <select id="${key}" onchange="handlePartyTypeChange(this)" ${affectedPaths}>
        <option value="">Select...</option>
        ${data.options
          .map((opt) => `<option value="${opt}">${opt}</option>`)
          .join("")}
      </select>
    `;
  } else if (key === "termType") {
    return `
      <select id="${key}" onchange="handleTermTypeChange(this)" ${affectedPaths}>
        <option value="">Select...</option>
        ${data.options
          .map((opt) => `<option value="${opt}">${opt}</option>`)
          .join("")}
      </select>
    `;
  } else if (key === "productDefinitionType") {
    return `
      <select id="${key}" onchange="handleProductDefinitionChange(this)" ${affectedPaths}>
        <option value="">Select...</option>
        ${data.options
          .map((opt) => `<option value="${opt}">${opt}</option>`)
          .join("")}
      </select>
    `;
  } else if (key === "invoiceTiming") {
    return `
      <select id="${key}" onchange="handleInvoiceTimingChange(this)" ${affectedPaths}>
        <option value="">Select...</option>
        ${data.options
          .map((opt) => `<option value="${opt}">${opt}</option>`)
          .join("")}
      </select>
    `;
  } else if (data.type === "select") {
    return `
      <select id="${fullId}" onchange="handleFieldChange(this)" ${affectedPaths}>
        <option value="">Select...</option>
        ${data.options
          .map((opt) => `<option value="${opt}">${opt}</option>`)
          .join("")}
      </select>
    `;
  }

  // Create the appropriate input element with default value if available
  switch (data.type) {
    case "textarea":
      return `<textarea id="${fullId}" class="form-textarea" data-original-key="${key}" ${affectedPaths}>${data.default || ""}</textarea>`;
    case "date":
      return `<input type="date" id="${fullId}" data-original-key="${key}" ${affectedPaths}>`;
    default:
      return `<input type="text" id="${fullId}" data-original-key="${key}" value="${data.default || ""}" ${affectedPaths}>`;
  }
}

// Handle field changes
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

// Handle term type selection
function handleTermTypeChange(selectElement) {
  // Save the selected value
  formDataStore[selectElement.id] = selectElement.value;

  // Show/hide the appropriate field based on selection
  document
    .querySelectorAll(`[data-show-if="${selectElement.id}"]`)
    .forEach((field) => {
      const showValue = field.getAttribute("data-show-value");
      field.style.display = showValue === selectElement.value ? "block" : "none";
    });

  // Update document with the selected term type
  updateDocumentWithFormData(formDataStore);
  updatePreview();
  
  // Highlight the affected sections
  highlightDocumentSection(selectElement.id);
}

// Handle product definition type selection
function handleProductDefinitionChange(selectElement) {
  // Save the selected value
  formDataStore[selectElement.id] = selectElement.value;

  // Show/hide the appropriate field based on selection
  document
    .querySelectorAll(`[data-show-if="${selectElement.id}"]`)
    .forEach((field) => {
      const showValue = field.getAttribute("data-show-value");
      field.style.display = showValue === selectElement.value ? "block" : "none";
    });

  // Update document with the selected product definition type
  updateDocumentWithFormData(formDataStore);
  updatePreview();
  
  // Highlight the affected sections
  highlightDocumentSection(selectElement.id);
}

// Handle invoice timing selection
function handleInvoiceTimingChange(selectElement) {
  // Save the selected value
  formDataStore[selectElement.id] = selectElement.value;

  // Show/hide the appropriate field based on selection
  document
    .querySelectorAll(`[data-show-if="${selectElement.id}"]`)
    .forEach((field) => {
      const showValue = field.getAttribute("data-show-value");
      field.style.display = showValue === selectElement.value ? "block" : "none";
    });

  // Update document with the selected invoice timing
  updateDocumentWithFormData(formDataStore);
  updatePreview();
  
  // Highlight the affected sections
  highlightDocumentSection(selectElement.id);
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
        if (input.id === "supplierType" || input.id === "distributorType") {
          handlePartyTypeChange(input);
        } else if (input.id === "termType") {
          handleTermTypeChange(input);
        } else if (input.id === "productDefinitionType") {
          handleProductDefinitionChange(input);
        } else if (input.id === "invoiceTiming") {
          handleInvoiceTimingChange(input);
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
  // Assume dateStr is in format yyyy-mm-dd
  if (!dateStr) return "*[Date]*";
  const [year, month, day] = dateStr.split("-");
  return `${day}-${month}-${year}`;
}

// Party type change handler
function handlePartyTypeChange(selectElement) {
  const isSupplier = selectElement.id === "supplierType";
  const isDistributor = selectElement.id === "distributorType";
  const selectedType = selectElement.value;

  if (!selectedType) return;

  // Clear previous values for other types from formDataStore
  const prefix = isSupplier ? "supplier_" : "distributor_";
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
function applyFormDataToFlatDocument(flatDoc, formData) {
  const updatedFlatDoc = { ...flatDoc };
  // Use a normalized title to ensure consistency
  const documentTitle = normalizedDocTitle;

  // Format date if provided
  if (formData.date) {
    const formattedDate = formatDate(formData.date);
    const dateKey = `${documentTitle}.DATE.content`;
    updatedFlatDoc[dateKey] = formattedDate;
  }

  // Update Supplier information (Party 1)
  if (formData.supplierType) {
    const party1Key = `${documentTitle}.PARTIES.1.content`;
    let party1Content = "";

    if (formData.supplierType === "Individual") {
      const name = formData.supplier_individual_name || "*[INDIVIDUAL NAME]*";
      const address = formData.supplier_individual_address || "*[address]*";
      party1Content = `${name} of ${address}`;
    } else if (formData.supplierType === "Company") {
      const name = formData.supplier_company_name || "*[COMPANY NAME]*";
      const regNumber = formData.supplier_company_regNumber || "*[registration number]*";
      const jurisdiction = formData.supplier_company_jurisdiction || "England and Wales";
      const address = formData.supplier_company_address || "*[address]*";
      party1Content = `${name}, a company incorporated in [${jurisdiction}] (registration number ${regNumber}) having its registered office at ${address}`;
    } else if (formData.supplierType === "Partnership") {
      const name = formData.supplier_partnership_name || "*[PARTNERSHIP NAME]*";
      const jurisdiction = formData.supplier_partnership_jurisdiction || "England and Wales";
      const address = formData.supplier_partnership_address || "*[address]*";
      party1Content = `${name}, a partnership established under the laws of [${jurisdiction}] having its principal place of business at ${address}`;
    }

    if (party1Content) {
      updatedFlatDoc[party1Key] = party1Content + ' (the "Supplier")';
    }
  }

  // Update Distributor information (Party 2)
  if (formData.distributorType) {
    const party2Key = `${documentTitle}.PARTIES.2.content`;
    let party2Content = "";

    if (formData.distributorType === "Individual") {
      const name = formData.distributor_individual_name || "*[INDIVIDUAL NAME]*";
      const address = formData.distributor_individual_address || "*[address]*";
      party2Content = `${name} of ${address}`;
    } else if (formData.distributorType === "Company") {
      const name = formData.distributor_company_name || "*[COMPANY NAME]*";
      const regNumber = formData.distributor_company_regNumber || "*[registration number]*";
      const jurisdiction = formData.distributor_company_jurisdiction || "England and Wales";
      const address = formData.distributor_company_address || "*[address]*";
      party2Content = `${name}, a company incorporated in [${jurisdiction}] (registration number ${regNumber}) having its registered office at ${address}`;
    } else if (formData.distributorType === "Partnership") {
      const name = formData.distributor_partnership_name || "*[PARTNERSHIP NAME]*";
      const jurisdiction = formData.distributor_partnership_jurisdiction || "England and Wales";
      const address = formData.distributor_partnership_address || "*[address]*";
      party2Content = `${name}, a partnership established under the laws of [${jurisdiction}] having its principal place of business at ${address}`;
    }

    if (party2Content) {
      updatedFlatDoc[party2Key] = party2Content + ' (the "Distributor")';
    }
  }

  // Update Background information
  if (formData.supplierBackground) {
    updatedFlatDoc[`${documentTitle}.BACKGROUND.1.content`] = formData.supplierBackground;
  }
  
  if (formData.distributorBackground) {
    updatedFlatDoc[`${documentTitle}.BACKGROUND.2.content`] = formData.distributorBackground;
  }

  // Update Agreement Term
  if (formData.termType) {
    const termKey = `${documentTitle}.AGREEMENT.3. Term.3.2.content`;
    let termContent = "This Agreement shall continue in force ";
    
    if (formData.termType === "Indefinite") {
      termContent += "[indefinitely]";
    } else if (formData.termType === "Specific Date" && formData.termDate) {
      const formattedTermDate = formatDate(formData.termDate);
      termContent += `until ${formattedTermDate}, at the beginning of which this Agreement shall terminate automatically`;
    } else if (formData.termType === "Specific Event" && formData.termEvent) {
      termContent += `until ${formData.termEvent}, upon which this Agreement shall terminate automatically`;
    } else {
      // Default if incomplete info
      termContent += "[indefinitely]";
    }
    
    termContent += ", subject to termination in accordance with Clause 16 or any other provision of this Agreement.";
    updatedFlatDoc[termKey] = termContent;
  }

  // Update Territory and Reserved Territory
  if (formData.territory) {
    updatedFlatDoc[`${documentTitle}.AGREEMENT.2. Definitions.2.1.Territory`] = formData.territory;
  }
  
  if (formData.reservedTerritory) {
    updatedFlatDoc[`${documentTitle}.AGREEMENT.2. Definitions.2.1.Reserved Territory`] = formData.reservedTerritory;
  }

  // Update Products definition
  if (formData.productDefinitionType) {
    const productsKey = `${documentTitle}.AGREEMENT.2. Definitions.2.1.Products`;
    
    if (formData.productDefinitionType === "Specify Products" && formData.productsList) {
      updatedFlatDoc[`${productsKey}`] = formData.productsList;
    } else if (formData.productDefinitionType === "Any Supplier Products") {
      updatedFlatDoc[`${productsKey}`] = "[any products that the Supplier supplies or agrees in writing to supply to the Distributor from time to time]";
    } else if (formData.productDefinitionType === "Reference Schedule") {
      updatedFlatDoc[`${productsKey}`] = "[those products identified in Paragraph 1 of Schedule 1 (Distribution particulars)]";
    }
  }

  // Update VAT option in Charges
  if (formData.vatOption) {
    const vatContent = formData.vatOption === "Inclusive of VAT" 
      ? "All amounts stated in or in relation to this Agreement are, unless the context requires otherwise, stated [inclusive of any applicable value added taxes]" 
      : "All amounts stated in or in relation to this Agreement are, unless the context requires otherwise, stated [exclusive of any applicable value added taxes, which will be added to those amounts and payable by the Distributor to the Supplier]";
      
    updatedFlatDoc[`${documentTitle}.AGREEMENT.9. Charges.9.2.content`] = vatContent;
  }

  // Update Payment Terms
  if (formData.paymentTiming) {
    let paymentContent = `The Distributor must pay the Charges to the Supplier within the period of [${formData.paymentTiming} days] following [the issue of an invoice in accordance with this Clause 10]`;
    updatedFlatDoc[`${documentTitle}.AGREEMENT.10. Payments.10.2.content`] = paymentContent;
  }
  
  if (formData.paymentMethods) {
    let methodsContent = `The Distributor must pay the Charges by [${formData.paymentMethods}] (using such payment details as are notified by the Supplier to the Distributor from time to time).`;
    updatedFlatDoc[`${documentTitle}.AGREEMENT.10. Payments.10.3.content`] = methodsContent;
  }
  
  // Update Invoice Timing
  if (formData.invoiceTiming) {
    let invoiceContent = "The Supplier shall issue an invoice for the Charges to the Distributor ";
    
    if (formData.invoiceTiming === "On supply of Products") {
      invoiceContent += "[promptly] following [the supply of the Products]";
    } else if (formData.invoiceTiming === "On agreement of Order") {
      invoiceContent += "[promptly] following [the agreement of an Order in respect of the Products]";
    } else if (formData.invoiceTiming === "Other (specify)" && formData.invoiceOtherTiming) {
      invoiceContent += `[at any time] following [${formData.invoiceOtherTiming}]`;
    } else {
      // Default if incomplete
      invoiceContent += "[promptly] following [the supply of the Products]";
    }
    
    invoiceContent += ".";
    updatedFlatDoc[`${documentTitle}.AGREEMENT.10. Payments.10.1.content`] = invoiceContent;
  }

  // Update Schedule information
  if (formData.productDetails) {
    updatedFlatDoc[`${documentTitle}.SCHEDULE 1.DISTRIBUTION PARTICULARS.1. Products.content`] = formData.productDetails;
  }
  
  if (formData.chargeDetails) {
    updatedFlatDoc[`${documentTitle}.SCHEDULE 1.DISTRIBUTION PARTICULARS.2. Charges.content`] = formData.chargeDetails;
  }
  
  if (formData.deliveryTerms) {
    updatedFlatDoc[`${documentTitle}.SCHEDULE 2.TERMS AND CONDITIONS OF SUPPLY.1. Delivery.content`] = formData.deliveryTerms;
  }
  
  if (formData.qualityRequirements) {
    updatedFlatDoc[`${documentTitle}.SCHEDULE 2.TERMS AND CONDITIONS OF SUPPLY.2. Quality.content`] = formData.qualityRequirements;
  }
  
  if (formData.riskAndTitle) {
    updatedFlatDoc[`${documentTitle}.SCHEDULE 2.TERMS AND CONDITIONS OF SUPPLY.3. Risk and Title.content`] = formData.riskAndTitle;
  }
  
  if (formData.returnsAndReplacements) {
    updatedFlatDoc[`${documentTitle}.SCHEDULE 2.TERMS AND CONDITIONS OF SUPPLY.4. Returns and Replacements.content`] = formData.returnsAndReplacements;
  }

  // Update Execution (signature blocks) for Supplier
  if (formData.supplierType) {
    const supplierSigKey = `${documentTitle}.EXECUTION.signature_blocks.supplier`;
    let signatureContent = "";

    if (formData.supplierType === "Individual") {
      const name = formData.supplier_individual_name || "*[individual name]*";
      signatureContent = `SIGNED BY ${name} on [...........], the Supplier`;
    } else if (formData.supplierType === "Company") {
      const name = formData.supplier_company_name || "*[COMPANY NAME]*";
      const signatory = formData.supplier_company_signatory || "*[individual name]*";
      signatureContent = `SIGNED BY ${signatory} on [...........], duly authorised for and on behalf of ${name}`;
    } else if (formData.supplierType === "Partnership") {
      const name = formData.supplier_partnership_name || "*[PARTNERSHIP NAME]*";
      const signatory = formData.supplier_partnership_signatory || "*[individual name]*";
      signatureContent = `SIGNED BY ${signatory} on [...........], duly authorised for and on behalf of ${name}`;
    }

    if (signatureContent) {
      updatedFlatDoc[supplierSigKey] = signatureContent;
    }
  }

  // Update Execution (signature blocks) for Distributor
  if (formData.distributorType) {
    const distributorSigKey = `${documentTitle}.EXECUTION.signature_blocks.distributor`;
    let signatureContent = "";

    if (formData.distributorType === "Individual") {
      const name = formData.distributor_individual_name || "*[individual name]*";
      signatureContent = `SIGNED BY ${name} on [...........], the Distributor`;
    } else if (formData.distributorType === "Company") {
      const name = formData.distributor_company_name || "*[COMPANY NAME]*";
      const signatory = formData.distributor_company_signatory || "*[individual name]*";
      signatureContent = `SIGNED BY ${signatory} on [...........], duly authorised for and on behalf of ${name}`;
    } else if (formData.distributorType === "Partnership") {
      const name = formData.distributor_partnership_name || "*[PARTNERSHIP NAME]*";
      const signatory = formData.distributor_partnership_signatory || "*[individual name]*";
      signatureContent = `SIGNED BY ${signatory} on [...........], duly authorised for and on behalf of ${name}`;
    }

    if (signatureContent) {
      updatedFlatDoc[distributorSigKey] = signatureContent;
    }
  }

  return updatedFlatDoc;
}

// Main function for updating document with form data
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

/* --- Document Editing Functions --- */
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

// Insert new content with styling options
function insertNewContent() {
  const key = document.getElementById("newKey").value.trim();
  const value = document.getElementById("newValue").value.trim();
  const keyFontSize =
    document.getElementById("keyFontSize").value.trim() || "16";
  const keyColor = document.getElementById("keyColor").value || "#000000";
  const keyFontFamily = document.getElementById("keyFontFamily").value;
  const keyFontStyle = document.getElementById("keyFontStyle").value;
  const keyFontWeight = document.getElementById("keyFontWeight").value;
  const keyTextDecoration = document.getElementById("keyTextDecoration").value;
  const valueFontSize =
    document.getElementById("valueFontSize").value.trim() || "14";
  const valueColor = document.getElementById("valueColor").value || "#333333";
  const valueFontFamily = document.getElementById("valueFontFamily").value;
  const valueFontStyle = document.getElementById("valueFontStyle").value;
  const valueFontWeight = document.getElementById("valueFontWeight").value;
  const valueTextDecoration = document.getElementById(
    "valueTextDecoration"
  ).value;

  if (key === "" && value === "") {
    alert("Please enter at least a key or a value.");
    return;
  }

  const newPara = document.createElement("p");
  newPara.innerHTML = `
        <span class="key" style="
            font-size: ${keyFontSize + "px"};
            color: ${keyColor};
            font-family: ${keyFontFamily};
            font-style: ${keyFontStyle};
            font-weight: ${keyFontWeight};
            text-decoration: ${keyTextDecoration}
        ">
            ${key}:
        </span>
        <span class="value" style="
            font-size: ${valueFontSize + "px"};
            color: ${valueColor};
            font-family: ${valueFontFamily};
            font-style: ${valueFontStyle};
            font-weight: ${valueFontWeight};
            text-decoration: ${valueTextDecoration}
        ">
            ${value}
        </span>
    `;

  const previewElem = document.getElementById("documentPreview");
  if (savedRange && previewElem.contains(savedRange.startContainer)) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange);
    savedRange.deleteContents();
    savedRange.insertNode(newPara);
    savedRange.setStartAfter(newPara);
    savedRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(savedRange);
  } else {
    previewElem.appendChild(newPara);
  }

  newPara.scrollIntoView({ behavior: "smooth" });

  // Reset inputs
  document.getElementById("newKey").value = "";
  document.getElementById("newValue").value = "";
  document.getElementById("keyFontSize").value = "";
  document.getElementById("valueFontSize").value = "";
  document.getElementById("keyColor").value = "#000000";
  document.getElementById("valueColor").value = "#333333";
  document.getElementById("keyFontFamily").selectedIndex = 0;
  document.getElementById("keyFontStyle").selectedIndex = 0;
  document.getElementById("keyFontWeight").selectedIndex = 0;
  document.getElementById("keyTextDecoration").selectedIndex = 0;
  document.getElementById("valueFontFamily").selectedIndex = 0;
  document.getElementById("valueFontStyle").selectedIndex = 0;
  document.getElementById("valueFontWeight").selectedIndex = 0;
  document.getElementById("valueTextDecoration").selectedIndex = 0;

  closeInsertDialog();
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

/* --- Value Editing --- */
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

  if (input) {
    input.readOnly = false;
    if (editButton) editButton.style.display = "none";
    if (aiButton) aiButton.style.display = "none";
    if (saveButton) saveButton.disabled = false;
  }
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

/* --- Document Download --- */
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
          font-family: 'Times New Roman', Times, serif;
          font-size: 12pt;
          line-height: 1.5;
          color: #000;
        }
        
        /* Document title */
        .document-title {
          font-size: 16pt;
          font-weight: bold;
          margin-bottom: 24pt;
          text-align: center;
        }
        
        /* Main sections */
        .main-section h5 {
          font-size: 14pt;
          font-weight: bold;
          margin-top: 18pt;
          margin-bottom: 12pt;
        }
        
        /* Sub-sections */
        .sub-section h6 {
          font-size: 12pt;
          font-weight: bold;
          margin-top: 12pt;
          margin-bottom: 6pt;
        }
        
        /* Content paragraphs */
        .document-content {
          margin-bottom: 6pt;
        }
        
        /* Remove highlight styling */
        .highlighted, .highlighted-section {
          background-color: transparent !important;
          box-shadow: none !important;
          border-left: none !important;
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
  link.download = "distribution-agreement.docx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Helper function to clean up content for DOCX
function cleanupForDocx(element) {
  // Remove any highlighting classes
  const highlighted = element.querySelectorAll('.highlighted, .highlighted-section');
  highlighted.forEach(el => {
    el.classList.remove('highlighted');
    el.classList.remove('highlighted-section');
  });

  // Set consistent margins and indentation
  const sections = element.querySelectorAll('.document-line');
  sections.forEach(section => {
    section.style.marginLeft = '0';
  });

  // Add proper indentation for numbered clauses
  const contentItems = element.querySelectorAll('.document-content');
  contentItems.forEach(item => {
    // Check if this is a numbered clause (like "4.1:", "5.2:", etc.)
    const text = item.textContent;
    const numberMatch = text.match(/^(\d+\.\d+):\s*(.*)/);
    if (numberMatch) {
      item.style.paddingLeft = '0.25in';
      item.style.textIndent = '-0.25in';
    }
  });
}

document.addEventListener("DOMContentLoaded", async function () {
  console.log("Document initialization started");
  if (!window.currentDocument) {
    console.error("No document found in window.currentDocument");
    window.currentDocument = { "Non-exclusive distribution agreement": {} };
  }

  try {
    // Initialize the document template
    initializeDocumentTemplate();

    showQuestionnaire();
    // Then initialize the preview
    updatePreview();

    // Register highlighting events after questionnaire is shown
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
    showNotification("Edit mode enabled. You can now directly edit the document text.");
  } else {
    // Disable editing mode
    previewElem.contentEditable = false;
    previewElem.classList.remove("editable");
    showNotification("Edit mode disabled. Changes made in edit mode remain.");
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

// Export functions to global scope
window.downloadWordDocx = downloadWordDocx;
window.showQuestionnaire = showQuestionnaire;
window.submitQuestionnaire = submitQuestionnaire;
window.handleFieldChange = handleFieldChange;
window.handleTermTypeChange = handleTermTypeChange;
window.handleProductDefinitionChange = handleProductDefinitionChange;
window.handleInvoiceTimingChange = handleInvoiceTimingChange;
window.handlePartyTypeChange = handlePartyTypeChange;
window.highlightDocumentSection = highlightDocumentSection;
window.clearHighlights = clearHighlights;
window.updateValueWithAI = updateValueWithAI;
window.editValue = editValue;
window.saveValue = saveValue;
window.openEditDialog = openEditDialog;
window.closeEditDialog = closeEditDialog;
window.submitAIEditRequest = submitAIEditRequest;
window.toggleEditMode = toggleEditMode;