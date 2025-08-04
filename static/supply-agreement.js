// Supply Agreement Order Configuration
const sectionOrder = [
  "TITLE",
  "AGREEMENT_TEXT",
  "PARTIES",
  "DESCRIPTION OF GOODS",
  "QUANTITY",
  "DELIVERY SCHEDULE",
  "INSPECTION",
  "PRICE",
  "INVOICING AND PAYMENT",
  "TAXES",
  "TERM",
  "TERMINATION FOR CAUSE",
  "SUPPLIER WARRANTIES",
  "INDEMNIFICATION",
  "CONFIDENTIALITY",
  "GOVERNING LAW",
  "DISPUTE RESOLUTION",
  "ENTIRE AGREEMENT",
  "AMENDMENTS",
  "ASSIGNMENT",
  "EXECUTION"
];

// Store document template
let documentTemplate;

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

// Predefined questions for document
const documentQuestions = {
  step1: {
    title: "Basic Agreement Information",
    date: {
      question: "Enter the date of the agreement",
      type: "date",
    },
    supplierType: {
      question: "Select type of Supplier",
      type: "select",
      options: ["Individual", "Company"],
    },
    supplier_name: {
      question: "Enter supplier's name",
      type: "text",
      showIf: "supplierType=Individual",
    },
    supplier_company_name: {
      question: "Enter supplier company name",
      type: "text",
      showIf: "supplierType=Company",
    },
    supplier_address: {
      question: "Enter supplier's address",
      type: "text",
    },
    customerType: {
      question: "Select type of Customer",
      type: "select",
      options: ["Individual", "Company"],
    },
    customer_name: {
      question: "Enter customer's name",
      type: "text",
      showIf: "customerType=Individual",
    },
    customer_company_name: {
      question: "Enter customer company name",
      type: "text",
      showIf: "customerType=Company",
    },
    customer_address: {
      question: "Enter customer's address",
      type: "text",
    },
  },
  step2: {
    title: "Description of Goods/Services",
    number_of_items: {
      question: "How many items/products will be supplied?",
      type: "select",
      options: ["1", "2", "3", "4", "5", "6"],
      required: true,
    },
    goods_item_1: {
      question: "Enter the first item/product to be supplied",
      type: "text",
      required: true,
    },
    goods_item_2: {
      question: "Enter the second item/product to be supplied (optional)",
      type: "text",
      showIf: "number_of_items=2,3,4,5,6",
    },
    goods_item_3: {
      question: "Enter the third item/product to be supplied (optional)",
      type: "text",
      showIf: "number_of_items=3,4,5,6",
    },
    goods_item_4: {
      question: "Enter the fourth item/product to be supplied (optional)",
      type: "text",
      showIf: "number_of_items=4,5,6",
    },
    goods_item_5: {
      question: "Enter the fifth item/product to be supplied (optional)",
      type: "text",
      showIf: "number_of_items=5,6",
    },
    goods_item_6: {
      question: "Enter the sixth item/product to be supplied (optional)",
      type: "text",
      showIf: "number_of_items=6",
    },
  },
  step3: {
    title: "Legal Terms",
    notice_period: {
      question: "Enter notice period for termination (e.g., '30 days')",
      type: "text",
    },
    governing_law: {
      question: "Enter governing law jurisdiction",
      type: "text",
    },
    arbitration_body: {
      question: "Enter arbitration body",
      type: "text",
    },
  },
  step4: {
    title: "Signature Details",
    supplier_signatory: {
      question: "Name of person signing for Supplier",
      type: "text",
    },
    customer_signatory: {
      question: "Name of person signing for Customer",
      type: "text",
    },
  }
};

// Update the document path mapping to include goods items
const documentPathMap = {
  // Date field
  date: ["Supply Agreement.AGREEMENT_TEXT.content"],

  // Supplier fields
  supplierType: ["Supply Agreement.PARTIES.between.content"],
  supplier_name: ["Supply Agreement.PARTIES.between.content"],
  supplier_company_name: ["Supply Agreement.PARTIES.between.content"],
  supplier_address: ["Supply Agreement.PARTIES.between.content"],

  // Customer fields
  customerType: ["Supply Agreement.PARTIES.and.content"],
  customer_name: ["Supply Agreement.PARTIES.and.content"],
  customer_company_name: ["Supply Agreement.PARTIES.and.content"],
  customer_address: ["Supply Agreement.PARTIES.and.content"],

  // Goods description items
  goods_item_1: ["Supply Agreement.DESCRIPTION OF GOODS.items.1"],
  goods_item_2: ["Supply Agreement.DESCRIPTION OF GOODS.items.2"],
  goods_item_3: ["Supply Agreement.DESCRIPTION OF GOODS.items.3"],
  goods_item_4: ["Supply Agreement.DESCRIPTION OF GOODS.items.4"],
  goods_item_5: ["Supply Agreement.DESCRIPTION OF GOODS.items.5"],
  goods_item_6: ["Supply Agreement.DESCRIPTION OF GOODS.items.6"],

  // Agreement terms
  notice_period: ["Supply Agreement.TERM.content"],
  governing_law: ["Supply Agreement.GOVERNING LAW.content"],
  arbitration_body: ["Supply Agreement.DISPUTE RESOLUTION.content"],

  // Signature details
  supplier_signatory: ["Supply Agreement.EXECUTION.signature_blocks.supplier.name_line"],
  customer_signatory: ["Supply Agreement.EXECUTION.signature_blocks.customer.name_line"]
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

document.addEventListener("DOMContentLoaded", async function () {
  console.log("Document initialization started");
  if (!window.currentDocument) {
    console.error("No document found in window.currentDocument");
    window.currentDocument = { "Supply Agreement": {} };
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

// Convert document object to HTML for preview
function convertToHtml(document) {
  let html = [];
  const documentTitle = Object.keys(document)[0];
  if (documentTitle) {
    // Don't add document title div - the title is part of the content now
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

    // Handle special case for TITLE section
    if (key === "TITLE") {
      html.push(
        `<div class="document-line document-title" data-path="${currentPath}" style="margin-left: ${marginLeft}px; text-align: center;">
            <span data-value-path="${currentPath}.content">${processMarkdown(value.content)}</span>
        </div>`
      );
      return;
    }

    // Handle special case for AGREEMENT_TEXT
    if (key === "AGREEMENT_TEXT") {
      html.push(
        `<div class="document-line document-content" data-path="${currentPath}" style="margin-left: ${marginLeft}px; margin-bottom: 20px;">
            <span data-value-path="${currentPath}.content">${processMarkdown(value.content)}</span>
        </div>`
      );
      return;
    }

    // Handle special case for PARTIES table format
    if (key === "PARTIES" && value.table) {
      html.push(
        `<div class="document-line document-parties-table" data-path="${currentPath}" style="margin-left: ${marginLeft}px; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                    <td style="width: 20%; vertical-align: top; padding: 5px;">
                        <span data-value-path="${currentPath}.between.label"><strong>${processMarkdown(value.between.label)}</strong></span>
                    </td>
                    <td style="vertical-align: top; padding: 5px;">
                        <span data-value-path="${currentPath}.between.content">${processMarkdown(value.between.content)}</span>
                    </td>
                </tr>
                <tr>
                    <td style="width: 20%; vertical-align: top; padding: 5px;">
                        <span data-value-path="${currentPath}.and.label"><strong>${processMarkdown(value.and.label)}</strong></span>
                    </td>
                    <td style="vertical-align: top; padding: 5px;">
                        <span data-value-path="${currentPath}.and.content">${processMarkdown(value.and.content)}</span>
                    </td>
                </tr>
            </table>
        </div>`
      );
      return;
    }

    // Handle regular section headers
    if (isMainSection && key !== "EXECUTION") {
      html.push(
        `<div class="document-line ${sectionClass}" data-path="${currentPath}" style="margin-left: ${marginLeft}px;">
            <h5 style="font-weight: bold;"><strong>${key}</strong></h5>
        </div>`
      );
    } else if (key !== "EXECUTION") {
      html.push(
        `<div class="document-line ${sectionClass}" data-path="${currentPath}" style="margin-left: ${
          marginLeft + 20
        }px;">
            <h6><strong>${key}</strong></h6>
        </div>`
      );
    }

    if (typeof value === "object" && value !== null) {
      if (value.content !== undefined) {
        html.push(
          `<div class="document-line document-content" data-path="${currentPath}.content" style="margin-left: ${marginLeft + 20}px;">
                        <span data-value-path="${currentPath}.content">
                            ${processMarkdown(value.content)}
                        </span>
                    </div>`
        );
      }

      // Process items array if it exists
      if (value.items) {
        processItems(value.items, currentPath, marginLeft + 30);
      }

      // Process warranties array if it exists
      if (value.warranties) {
        processWarranties(value.warranties, currentPath, marginLeft + 30);
      }

      // Process signature blocks if they exist with table format
      if (value.signature_blocks && value.signature_format === "table") {
        processSignatureBlocksTable(value.signature_blocks, currentPath, marginLeft + 30);
      } else if (value.signature_blocks) {
        processSignatureBlocks(value.signature_blocks, currentPath, marginLeft + 30);
      }

      // Process footer if it exists
      if (value.footer) {
        html.push(
          `<div class="document-line document-footer" data-path="${currentPath}.footer" style="margin-left: ${marginLeft + 20}px;">
                        <span data-value-path="${currentPath}.footer">
                            ${processMarkdown(value.footer)}
                        </span>
                    </div>`
        );
      }

      // Process any other object properties (except those we've already handled)
      const processedKeys = ['content', 'items', 'warranties', 'signature_blocks', 'footer', 'between', 'and', 'table', 'signature_format'];
      Object.keys(value).forEach(subKey => {
        if (!processedKeys.includes(subKey)) {
          const subValue = value[subKey];
          if (typeof subValue === 'object' && subValue !== null) {
            processSection(subKey, subValue, level + 1, currentPath);
          } else {
            html.push(
              `<div class="document-line document-content" data-path="${currentPath}.${subKey}" style="margin-left: ${marginLeft + 40}px;">
                            <span data-value-path="${currentPath}.${subKey}">
                                <strong>${subKey}:</strong> ${processMarkdown(subValue)}
                            </span>
                        </div>`
            );
          }
        }
      });
    } else if (value !== null && value !== undefined) {
      html.push(
        `<div class="document-line document-content" data-path="${currentPath}" style="margin-left: ${marginLeft + 20}px;">
                    <span data-value-path="${currentPath}">
                        ${processMarkdown(value)}
                    </span>
                </div>`
      );
    }
  }

  function processItems(items, parentPath, marginLeft) {
    Object.entries(items).forEach(([key, value]) => {
      html.push(
        `<div class="document-line document-item" data-path="${parentPath}.items.${key}" style="margin-left: ${marginLeft}px;">
                <span data-value-path="${parentPath}.items.${key}">
                    ${key}. ${processMarkdown(value)}
                </span>
            </div>`
      );
    });
  }

  function processWarranties(warranties, parentPath, marginLeft) {
    warranties.forEach((warranty, index) => {
      html.push(
        `<div class="document-line document-warranty" data-path="${parentPath}.warranties.${index}" style="margin-left: ${marginLeft}px;">
                <span data-value-path="${parentPath}.warranties.${index}">
                    • ${processMarkdown(warranty)}
                </span>
            </div>`
      );
    });
  }

  function processSignatureBlocks(signatureBlocks, parentPath, marginLeft) {
    Object.entries(signatureBlocks).forEach(([party, block]) => {
      html.push(
        `<div class="document-line document-signature" data-path="${parentPath}.signature_blocks.${party}" style="margin-left: ${marginLeft}px; margin-top: 20px;">
                <div data-value-path="${parentPath}.signature_blocks.${party}.title" style="font-weight: bold;">
                    ${processMarkdown(block.title)}
                </div>
                <div data-value-path="${parentPath}.signature_blocks.${party}.signature_line" style="margin-top: 10px;">
                    ${processMarkdown(block.signature_line)}: _______________________
                </div>
                <div data-value-path="${parentPath}.signature_blocks.${party}.name_line" style="margin-top: 10px;">
                    ${processMarkdown(block.name_line)}: _______________________
                </div>
                <div data-value-path="${parentPath}.signature_blocks.${party}.date_line" style="margin-top: 10px;">
                    ${processMarkdown(block.date_line)}: _______________________
                </div>
            </div>`
      );
    });
  }

  function processSignatureBlocksTable(signatureBlocks, parentPath, marginLeft) {
    html.push(`
      <div class="document-line document-signature-table" data-path="${parentPath}.signature_blocks" style="margin-left: ${marginLeft}px; margin-top: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 50%; padding: 5px; text-align: center; vertical-align: top; font-weight: bold;">
              <span data-value-path="${parentPath}.signature_blocks.supplier.title">${processMarkdown(signatureBlocks.supplier.title)}</span>
            </td>
            <td style="width: 50%; padding: 5px; text-align: center; vertical-align: top; font-weight: bold;">
              <span data-value-path="${parentPath}.signature_blocks.customer.title">${processMarkdown(signatureBlocks.customer.title)}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 15px; text-align: center; vertical-align: top;">
              <span data-value-path="${parentPath}.signature_blocks.supplier.signature_line">${processMarkdown(signatureBlocks.supplier.signature_line)}</span>
            </td>
            <td style="padding: 15px; text-align: center; vertical-align: top;">
              <span data-value-path="${parentPath}.signature_blocks.customer.signature_line">${processMarkdown(signatureBlocks.customer.signature_line)}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 5px; text-align: center; vertical-align: top;">
              <div style="border-bottom: 1px solid #000; margin: 0 20px;">&#160;</div>
              <span data-value-path="${parentPath}.signature_blocks.supplier.name_line">${processMarkdown(signatureBlocks.supplier.name_line)}</span>
            </td>
            <td style="padding: 5px; text-align: center; vertical-align: top;">
              <div style="border-bottom: 1px solid #000; margin: 0 20px;">&#160;</div>
              <span data-value-path="${parentPath}.signature_blocks.customer.name_line">${processMarkdown(signatureBlocks.customer.name_line)}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 15px; text-align: center; vertical-align: top;">
              <span data-value-path="${parentPath}.signature_blocks.supplier.date_line">${processMarkdown(signatureBlocks.supplier.date_line)}</span>
            </td>
            <td style="padding: 15px; text-align: center; vertical-align: top;">
              <span data-value-path="${parentPath}.signature_blocks.customer.date_line">${processMarkdown(signatureBlocks.customer.date_line)}</span>
            </td>
          </tr>
        </table>
      </div>
    `);
  }

  // Helper function to process Markdown-style formatting
  function processMarkdown(text) {
    if (!text) return text;

    // Convert Markdown bold (**text**) to HTML bold
    return text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
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
        if (this.id === "supplierType" || this.id === "customerType") {
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
  for (let step = 1; step <= Object.keys(documentQuestions).length; step++) {
    restoreStepData(step);
    registerHighlightEvents();
  }
}

function createQuestionsHTML(stepData) {
  let html = "";

  // Add section identifier classes
  const isSupplierSection =
    stepData.title && stepData.title.includes("Supplier");
  const isCustomerSection = stepData.title && stepData.title.includes("Customer");
  const sectionClass = isSupplierSection
    ? "supplier-section"
    : isCustomerSection
    ? "customer-section"
    : "";

  for (const [key, data] of Object.entries(stepData)) {
    if (key === "title") continue;

    if (typeof data === "object" && !data.type) {
      // This is a group of questions - add section class
      const groupClass = isSupplierSection
        ? "supplier-group"
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
  // Get affected paths for data attribute
  const affectedPaths = documentPathMap[key] ?
    `data-affects-path="${documentPathMap[key].join(',')}"` : "";

  // Create the appropriate input element
  switch (data.type) {
    case "select":
      return `
        <select id="${key}" onchange="handleFieldChange(this)" ${affectedPaths}>
          <option value="">Select...</option>
          ${data.options
            .map((opt) => `<option value="${opt}">${opt}</option>`)
            .join("")}
        </select>
      `;
    case "textarea":
      return `<textarea id="${key}" class="form-textarea" ${affectedPaths}></textarea>`;
    case "date":
      return `<input type="date" id="${key}" ${affectedPaths}>`;
    default:
      return `<input type="text" id="${key}" ${affectedPaths}>`;
  }
}

function handleFieldChange(element) {
  // Save the value
  formDataStore[element.id] = element.value;

  // Handle conditional fields with multiple possible values
  const condition = element.id;
  const value = element.value;

  document
    .querySelectorAll(`[data-show-if="${condition}"]`)
    .forEach((field) => {
      const showValues = field.dataset.showValue.split(',');
      field.style.display = showValues.includes(value) ? "block" : "none";
    });

  // Update document based on new field value
  updateDocumentWithFormData(formDataStore);
  updatePreview();
}

function handlePartyTypeChange(selectElement) {
  const isSupplier = selectElement.id === "supplierType";
  const isCustomer = selectElement.id === "customerType";
  const selectedType = selectElement.value;

  if (!selectedType) return;

  // Clear previous values for other types from formDataStore
  const prefix = isSupplier ? "supplier_" : "customer_";
  const allPartyTypes = ["individual", "company"];

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

  // Highlight the section affected by this dropdown
  highlightDocumentSection(selectElement.id);
}

function restoreStepData(stepNumber) {
  // Restore all saved values for this step
  document.querySelectorAll("input, select, textarea").forEach((input) => {
    if (input.id && formDataStore[input.id]) {
      input.value = formDataStore[input.id];

      // Handle conditional field visibility
      if (input.tagName === "SELECT") {
        // For party type selectors, use the specific handler
        if (input.id === "supplierType" || input.id === "customerType") {
          handlePartyTypeChange(input);
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
  if (!dateStr) return "[DATE]";
  // Assume dateStr is in format yyyy-mm-dd
  const [year, month, day] = dateStr.split("-");
  return `${day}-${month}-${year}`;
}

/**
 * Maps form data to document structure
 * @param {Object} flatDoc - Flattened document object
 * @param {Object} formData - The form data
 * @return {Object} Updated flat document
 */
function applyFormDataToFlatDocument(flatDoc, formData) {
  const updatedFlatDoc = { ...flatDoc };
  const documentTitle = Object.keys(window.currentDocument)[0] || "Supply Agreement";

  // Format date if provided
  if (formData.date) {
    const formattedDate = formatDate(formData.date);
    const dateKey = `${documentTitle}.AGREEMENT_TEXT.content`;
    let introContent = updatedFlatDoc[dateKey] || "";
    introContent = introContent.replace("[DATE]", formattedDate);
    updatedFlatDoc[dateKey] = introContent;
  }

  // Update Supplier information
  if (formData.supplierType) {
    const supplierKey = `${documentTitle}.PARTIES.between.content`;
    let supplierContent = "";

    if (formData.supplierType === "Individual") {
      const name = formData.supplier_name || "[SUPPLIER NAME]";
      const address = formData.supplier_address || "[SUPPLIER ADDRESS]";
      supplierContent = `**${name}**, with an address of ${address} (hereinafter referred to as the "Supplier")`;
    } else if (formData.supplierType === "Company") {
      const name = formData.supplier_company_name || "[SUPPLIER NAME]";
      const address = formData.supplier_company_address || "[SUPPLIER ADDRESS]";
      supplierContent = `**${name}**, with an address of ${address} (hereinafter referred to as the "Supplier")`;
    }

    if (supplierContent) {
      updatedFlatDoc[supplierKey] = supplierContent;
    }
  }

  // Update Customer information
  if (formData.customerType) {
    const customerKey = `${documentTitle}.PARTIES.and.content`;
    let customerContent = "";

    if (formData.customerType === "Individual") {
      const name = formData.customer_name || "[CUSTOMER NAME]";
      const address = formData.customer_address || "[CUSTOMER ADDRESS]";
      customerContent = `**${name}**, with a primary place of business located at ${address} (hereinafter referred to as the "Customer"), collectively referred to as the "Parties."`;
    } else if (formData.customerType === "Company") {
      const name = formData.customer_company_name || "[CUSTOMER NAME]";
      const address = formData.customer_company_address || "[CUSTOMER ADDRESS]";
      customerContent = `**${name}**, with its primary place of business located at ${address} (hereinafter referred to as the "Customer"), collectively referred to as the "Parties."`;
    }

    if (customerContent) {
      updatedFlatDoc[customerKey] = customerContent;
    }
  }

  // Update Notice Period
  if (formData.notice_period) {
    const termKey = `${documentTitle}.TERM.content`;
    let termContent = updatedFlatDoc[termKey] || "";
    termContent = termContent.replace("[NOTICE PERIOD]", formData.notice_period);
    updatedFlatDoc[termKey] = termContent;
  }

  // Update Governing Law
  if (formData.governing_law) {
    const lawKey = `${documentTitle}.GOVERNING LAW.content`;
    let lawContent = updatedFlatDoc[lawKey] || "";
    lawContent = lawContent.replace("[GOVERNING LAW JURISDICTION]", formData.governing_law);
    updatedFlatDoc[lawKey] = lawContent;
  }

  // Update Arbitration Body
  if (formData.arbitration_body) {
    const disputeKey = `${documentTitle}.DISPUTE RESOLUTION.content`;
    let disputeContent = updatedFlatDoc[disputeKey] || "";
    disputeContent = disputeContent.replace("[ARBITRATION BODY]", formData.arbitration_body);
    updatedFlatDoc[disputeKey] = disputeContent;
  }

  // Update Supplier Signature - FIXED: Now uses the actual signatory name
  if (formData.supplier_signatory) {
    const signatureKey = `${documentTitle}.EXECUTION.signature_blocks.supplier.name_line`;
    // Use the actual signatory name instead of just "Print Name"
    updatedFlatDoc[signatureKey] = formData.supplier_signatory;
  }

  // Update Customer Signature - FIXED: Now uses the actual signatory name
  if (formData.customer_signatory) {
    const signatureKey = `${documentTitle}.EXECUTION.signature_blocks.customer.name_line`;
    // Use the actual signatory name instead of just "Print Name"
    updatedFlatDoc[signatureKey] = formData.customer_signatory;
  }

  // Update Description of Goods items
  for (let i = 1; i <= 6; i++) {
    const itemKey = `goods_item_${i}`;
    if (formData[itemKey]) {
      const goodsItemKey = `${documentTitle}.DESCRIPTION OF GOODS.items.${i}`;
      updatedFlatDoc[goodsItemKey] = formData[itemKey];
    }
  }

  return updatedFlatDoc;
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

/* --- Utility Functions --- */
function splitPath(path) {
  let parts = path.split(".");
  return parts;
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
      previewElement.textContent = newValue;
    }

    updatePreview();

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
  saveButton.disabled = false;
}

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
            <title>Supply Agreement</title>
            <style>
                @page {
                    margin: 1in;
                }
                body {
                    font-family: 'Aptos', 'Arial', sans-serif;
                    font-size: 10pt;
                    line-height: 1.3;
                    color: #000;
                }
                
                /* Document title */
                .document-title {
                    font-size: 14pt;
                    font-weight: bold;
                    margin-bottom: 24pt;
                    text-align: center;
                }
                .document-title strong {
                    font-size: 14pt;
                }
                
                /* Main sections */
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
                
                /* Item lists */
                .document-item {
                    margin-top: 6pt;
                    margin-bottom: 6pt;
                    padding-left: 20px;
                }
                
                /* Warranty bullets */
                .document-warranty {
                    margin-top: 6pt;
                    margin-bottom: 6pt;
                    padding-left: 20px;
                }
                
                /* Signature section */
                .document-signature {
                    margin-top: 24pt;
                    margin-bottom: 24pt;
                }
                
                /* Table formatting */
                table {
                    width: 100%;
                    border-collapse: collapse;
                }
                
                td {
                    padding: 5px;
                    vertical-align: top;
                }
                
                /* Remove unwanted elements and styling */
                .highlighted, .highlighted-section {
                    background-color: transparent !important;
                    box-shadow: none !important;
                    border-left: none !important;
                    animation: none !important;
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
  link.download = "Supply_Agreement.docx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Helper function to clean up content for DOCX
function cleanupForDocx(element) {
  // 1. Remove any highlighting classes
  const highlighted = element.querySelectorAll('.highlighted, .highlighted-section');
  highlighted.forEach(el => {
    el.classList.remove('highlighted');
    el.classList.remove('highlighted-section');
  });

  // 2. Fix heading format (remove ##### and other markdown-like symbols)
  const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach(heading => {
    heading.textContent = heading.textContent.replace(/^#+\s*/, '').replace(/\*\*/g, '');
  });

  // 3. Properly handle section titles (remove ** characters)
  element.querySelectorAll('.main-section h5').forEach(title => {
    if (title.textContent.includes('**')) {
      title.textContent = title.textContent.replace(/\*\*/g, '');
      title.style.fontWeight = 'bold';
    }
  });

  // 4. Apply Aptos font to the document
  const fontStyle = document.createElement('style');
  fontStyle.textContent = `
    @font-face {
      font-family: 'Aptos';
      src: url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;700&display=swap');
    }
    body, table, td, p, div {
      font-family: 'Aptos', 'Manrope', 'Arial', sans-serif;
    }
  `;
  element.appendChild(fontStyle);

  // 5. Set consistent margins and indentation
  const sections = element.querySelectorAll('.document-line');
  sections.forEach(section => {
    section.style.marginLeft = '0';
  });

  // 6. Fix numbering format (add proper indentation for lists)
  const items = element.querySelectorAll('.document-item, .document-warranty');
  items.forEach(item => {
    item.style.marginLeft = '20px';
    item.style.textIndent = '-20px';
  });

  // 7. Ensure section headings are properly formatted in bold
  element.querySelectorAll('.main-section h5').forEach(heading => {
    heading.style.fontWeight = 'bold';
    heading.style.fontSize = '12pt';
  });
}

// Export functions to global scope
window.toggleEditMode = toggleEditMode;
window.showNotification = showNotification;
window.downloadWordDocx = downloadWordDocx;
window.showQuestionnaire = showQuestionnaire;
window.submitQuestionnaire = submitQuestionnaire;
window.handleFieldChange = handleFieldChange;
window.handlePartyTypeChange = handlePartyTypeChange;
window.updateValueWithAI = updateValueWithAI;
window.submitAIEditRequest = submitAIEditRequest;
window.closeEditDialog = closeEditDialog;
window.editValue = editValue;
window.saveValue = saveValue;