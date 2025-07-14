// Document order configuration
const sectionOrder = [
  "INVESTMENT AGREEMENT",
  "INTRODUCTION",
  "Recitals",
  "Share Subject to This Agreement",
  "Management and Control",
  "Distributions",
  "Dissolution",
  "Voting",
  "Restrictions on Transfer",
  "Permitted Transfers",
  "Noncompetition and Trade Secrets",
  "Termination and Amendment",
  "Miscellaneous Provisions",
  "SIGNATURES",
];

const agreementSectionOrder = [
  "1. Recitals",
  "2. Share Subject to This Agreement",
  "3. Management and Control",
  "4. Distributions",
  "5. Dissolution",
  "6. Voting",
  "7. Restrictions on Transfer",
  "8. Permitted Transfers",
  "9. Noncompetition and Trade Secrets",
  "10. Termination and Amendment",
  "11. Miscellaneous Provisions",
];

// Document template to store original structure
let documentTemplate = null;

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
    title: "Agreement Date & Place",
    date: {
      question: "Enter the date of agreement",
      type: "date",
    },
    place: {
      question: "Enter the place of agreement",
      type: "text",
    },
    signatureDate: {
      question: "Default signature date (for all shareholders)",
      type: "date",
    },
  },
  step2: {
    title: "Company Information",
    companyName: {
      question: "Company Name",
      type: "text",
    },
    companyAddress: {
      question: "Company Registered Address",
      type: "textarea",
    },
    shareholderCount: {
      question: "How many shareholders will be in this agreement?",
      type: "select",
      options: ["1", "2", "3", "4"],
    },
  },
  step3: {
    title: "Shareholder Information",
    shareholder1: {
      name: {
        question: "Shareholder 1 Full Name",
        type: "text",
      },
      address: {
        question: "Shareholder 1 Address",
        type: "textarea",
      },
      shares: {
        question: "Shareholder 1 Common Stock",
        type: "text",
      },
      signatureDate: {
        question: "Shareholder 1 Signature Date",
        type: "date",
      },
    },
    shareholder2: {
      name: {
        question: "Shareholder 2 Full Name",
        type: "text",
        showIf: "shareholderCount=2,3,4",
      },
      address: {
        question: "Shareholder 2 Address",
        type: "textarea",
        showIf: "shareholderCount=2,3,4",
      },
      shares: {
        question: "Shareholder 2 Common Stock",
        type: "text",
        showIf: "shareholderCount=2,3,4",
      },
      signatureDate: {
        question: "Shareholder 2 Signature Date",
        type: "date",
        showIf: "shareholderCount=2,3,4",
      },
    },
    shareholder3: {
      name: {
        question: "Shareholder 3 Full Name",
        type: "text",
        showIf: "shareholderCount=3,4",
      },
      address: {
        question: "Shareholder 3 Address",
        type: "textarea",
        showIf: "shareholderCount=3,4",
      },
      shares: {
        question: "Shareholder 3 Common Stock",
        type: "text",
        showIf: "shareholderCount=3,4",
      },
      signatureDate: {
        question: "Shareholder 3 Signature Date",
        type: "date",
        showIf: "shareholderCount=3,4",
      },
    },
    shareholder4: {
      name: {
        question: "Shareholder 4 Full Name",
        type: "text",
        showIf: "shareholderCount=4",
      },
      address: {
        question: "Shareholder 4 Address",
        type: "textarea",
        showIf: "shareholderCount=4",
      },
      shares: {
        question: "Shareholder 4 Common Stock",
        type: "text",
        showIf: "shareholderCount=4",
      },
      signatureDate: {
        question: "Shareholder 4 Signature Date",
        type: "date",
        showIf: "shareholderCount=4",
      },
    },
  },
  step4: {
    title: "Management Information",
    managingShareholder: {
      question: "Managing Shareholder Name",
      type: "text",
    },
    president: {
      question: "President",
      type: "text",
    },
    vicePresident: {
      question: "Vice President",
      type: "text",
    },
    secretary: {
      question: "Secretary",
      type: "text",
    },
    treasurer: {
      question: "Treasurer",
      type: "text",
    },
    restrictedPowers: {
      question:
        "Enter restrictions on Managing Shareholder powers (separate by commas)",
      type: "textarea",
    },
  },
  step5: {
    title: "Financial Terms",
    excessIncomeThreshold: {
      question: "Threshold for excess net income distribution ($)",
      type: "text",
    },
    distributionFrequency: {
      question: "Distribution Frequency",
      type: "select",
      options: [
        "weekly",
        "bi-weekly",
        "semi-monthly",
        "monthly",
        "quarterly",
        "semi-annually",
        "annually",
      ],
    },
    terminationSharePrice: {
      question: "Terminated shareholder share price ($)",
      type: "text",
    },
    terminationAmountLimit: {
      question: "Maximum payment for terminated shareholder shares ($)",
      type: "text",
    },
  },
  step6: {
    title: "Legal Terms",
    noncompeteYears: {
      question: "Non-compete duration (years)",
      type: "number",
      min: 1,
      max: 10,
    },
    governingLaw: {
      question: "Enter governing law jurisdiction",
      type: "text",
    },
  },
};

const documentPathMap = {
  // Agreement basics
  date: ["Investment Agreement.INTRODUCTION.content"],
  place: ["Investment Agreement.INVESTMENT AGREEMENT.place"],
  signatureDate: ["Investment Agreement.SIGNATURES.signature_blocks"],

  // Company information - ADD THESE TWO LINES
  companyName: ["Investment Agreement.INTRODUCTION.parties.company"],
  companyAddress: ["Investment Agreement.INTRODUCTION.parties.company"],

  // Shareholder signature dates
  "shareholder1.signatureDate": [
    "Investment Agreement.SIGNATURES.signature_blocks.0.date_line",
  ],
  "shareholder2.signatureDate": [
    "Investment Agreement.SIGNATURES.signature_blocks.1.date_line",
  ],
  "shareholder3.signatureDate": [
    "Investment Agreement.SIGNATURES.signature_blocks.2.date_line",
  ],
  "shareholder4.signatureDate": [
    "Investment Agreement.SIGNATURES.signature_blocks.3.date_line",
  ],

  // Shareholders info
  shareholderCount: ["Investment Agreement.INTRODUCTION.parties.shareholders"],
  "shareholder1.name": [
    "Investment Agreement.INTRODUCTION.parties.shareholders",
    "Investment Agreement.Share Subject to This Agreement.1.a",
  ],
  "shareholder1.address": [
    "Investment Agreement.INTRODUCTION.parties.shareholders",
  ],
  "shareholder1.shares": [
    "Investment Agreement.Share Subject to This Agreement.1.a",
  ],
  "shareholder2.name": [
    "Investment Agreement.INTRODUCTION.parties.shareholders",
    "Investment Agreement.Share Subject to This Agreement.1.b",
  ],
  "shareholder2.address": [
    "Investment Agreement.INTRODUCTION.parties.shareholders",
  ],
  "shareholder2.shares": [
    "Investment Agreement.Share Subject to This Agreement.1.b",
  ],
  "shareholder3.name": [
    "Investment Agreement.INTRODUCTION.parties.shareholders",
    "Investment Agreement.Share Subject to This Agreement.1.c",
  ],
  "shareholder3.address": [
    "Investment Agreement.INTRODUCTION.parties.shareholders",
  ],
  "shareholder3.shares": [
    "Investment Agreement.Share Subject to This Agreement.1.c",
  ],
  "shareholder4.name": [
    "Investment Agreement.INTRODUCTION.parties.shareholders",
    "Investment Agreement.Share Subject to This Agreement.1.d",
  ],
  "shareholder4.address": [
    "Investment Agreement.INTRODUCTION.parties.shareholders",
  ],
  "shareholder4.shares": [
    "Investment Agreement.Share Subject to This Agreement.1.d",
  ],

  // Management info
  managingShareholder: [
    "Investment Agreement.Management and Control.6.a",
    "Investment Agreement.Management and Control.6.b",
  ],
  president: ["Investment Agreement.Management and Control.10.b"],
  vicePresident: ["Investment Agreement.Management and Control.10.c"],
  secretary: ["Investment Agreement.Management and Control.10.d"],
  treasurer: ["Investment Agreement.Management and Control.10.e"],
  restrictedPowers: ["Investment Agreement.Management and Control.6.c"],

  // Financial terms
  excessIncomeThreshold: ["Investment Agreement.Distributions.14.a"],
  distributionFrequency: ["Investment Agreement.Distributions.14.a"],
  terminationSharePrice: ["Investment Agreement.Management and Control.11.c"],
  terminationAmountLimit: ["Investment Agreement.Management and Control.11.c"],

  // Legal terms
  noncompeteYears: [
    "Investment Agreement.Noncompetition and Trade Secrets.22.b",
  ],
  governingLaw: ["Investment Agreement.Miscellaneous Provisions.28.content"],
};

/**
 * Highlights document sections affected by a specific form field
 * @param {string} fieldId - The ID of the form field being focused
 */
function highlightDocumentSection(fieldId) {
  // Clear any existing highlights first
  clearHighlights();

  // Get the paths this field affects
  const paths = documentPathMap[fieldId];
  if (!paths || paths.length === 0) {
    // Handle nested fields like shareholder1.name
    if (fieldId.includes(".")) {
      const parentField = fieldId.split(".")[0];
      const paths = documentPathMap[parentField];

      if (paths && paths.length > 0) {
        highlightPaths(paths);
        return;
      }
    }
    return;
  }

  highlightPaths(paths);

  function highlightPaths(paths) {
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

    // Delay scrolling by a small amount to ensure highlighting is applied
    setTimeout(() => {
      // Scroll to the first highlighted element
      const firstHighlighted = document.querySelector(
        ".highlighted, .highlighted-section"
      );
      if (firstHighlighted) {
        firstHighlighted.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 10);
  }
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
    console.log("Loading document template...");
    try {
      const response = await fetch("../templates/investment-agreement.json");
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      window.currentDocument = await response.json();
      console.log(
        "Loaded investment-agreement.json into window.currentDocument"
      );
    } catch (e) {
      console.error("Failed to load investment-agreement.json:", e);
      window.currentDocument = { "Investment Agreement": {} }; // Fallback
    }
  }

  try {
    // Initialize the document template
    initializeDocumentTemplate();

    showQuestionnaire();
    // Then initialize the preview
    updateDocumentWithFormData(formDataStore);
    updatePreview();

    // Register highlighting events after questionnaire is shown
    setTimeout(registerHighlightEvents, 500);

    // Initialize AI editing functionality
    const previewElem = document.getElementById("documentPreview");
    if (previewElem) {
      previewElem.addEventListener("mouseup", handleTextSelection);
      previewElem.addEventListener("keyup", handleTextSelection);
    }

    // Initialize shareholders if needed
    try {
      const shareholderCountInput = document.getElementById("shareholderCount");
      if (shareholderCountInput) {
        if (!shareholderCountInput.value) {
          shareholderCountInput.value = "1";
          formDataStore["shareholderCount"] = "1";
          console.log("Set default shareholder count to 1");
        }

        // Force update fields and document
        updateVisibleFields();
        updateDocumentWithFormData(formDataStore);
        updatePreview();
      }
    } catch (error) {
      console.error("Error initializing shareholders:", error);
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

    // --- START: Handle INVESTMENT AGREEMENT section ---
    if (mainContent["INVESTMENT AGREEMENT"]) {
      const investmentAgreementValue = mainContent["INVESTMENT AGREEMENT"];
      const investmentAgreementPath = `${documentTitle}.INVESTMENT AGREEMENT`;
      // Render the INVESTMENT AGREEMENT section header
      html.push(
        `<div class="document-line main-section" data-path="${investmentAgreementPath}" style="margin-left: 0px;">
            <h5><strong>INVESTMENT AGREEMENT</strong></h5>
        </div>`
      );
      // Render the place property
      if (investmentAgreementValue.place) {
        const placePath = `${investmentAgreementPath}.place`;
        html.push(
          `<div class="document-line document-content" data-path="${placePath}" style="margin-left: 40px;">
            <span data-value-path="${placePath}">
                ${investmentAgreementValue.place}
            </span>
          </div>`
        );
      }
    }
    // --- END: Handle INVESTMENT AGREEMENT section ---

    // --- START: Handle INTRODUCTION section ---
    if (mainContent["INTRODUCTION"]) {
      const introValue = mainContent["INTRODUCTION"];
      const introPath = `${documentTitle}.INTRODUCTION`;
      // Render the INTRODUCTION section header
      html.push(
        `<div class="document-line main-section" data-path="${introPath}" style="margin-left: 0px;">
            <h5><strong>INTRODUCTION</strong></h5>
        </div>`
      );

      // Render the main content first
      if (introValue.content) {
        const contentPath = `${introPath}.content`;
        html.push(
          `<div class="document-line document-content" data-path="${contentPath}" style="margin-left: 40px;">
            <span data-value-path="${contentPath}">
                ${introValue.content}
            </span>
          </div>`
        );
      }

      // Handle parties section with improved logging and checks
      if (introValue.parties) {
        const partiesPath = `${introPath}.parties`;
        console.log("Parties object:", introValue.parties); // Debug log

        // Handle shareholders array with improved checking
        if (introValue.parties.shareholders) {
          console.log("Found shareholders:", introValue.parties.shareholders); // Debug log
          const shareholdersPath = `${partiesPath}.shareholders`;

          // Start shareholders section with proper data-path for highlighting
          html.push(
            `<div class="shareholders-section" data-path="${shareholdersPath}" style="margin-left: 40px;">`
          );

          // Handle both array and non-array cases
          if (Array.isArray(introValue.parties.shareholders)) {
            // Handle array of shareholders
            introValue.parties.shareholders.forEach((shareholder, index) => {
              html.push(
                `<div class="document-line document-content" style="margin-left: 40px;">
                  <span data-value-path="${shareholdersPath}.${index}">${shareholder}</span>
                </div>`
              );
            });
          } else {
            // Handle non-array case (for backwards compatibility)
            html.push(
              `<div class="document-line document-content" style="margin-left: 40px;">
                <span data-value-path="${shareholdersPath}">${introValue.parties.shareholders}</span>
              </div>`
            );
          }

          html.push(`</div>`);
        }

        // Handle company info
        if (introValue.parties.company) {
          const companyPath = `${partiesPath}.company`;
          html.push(
            `<div class="document-line document-content" style="margin-left: 40px;">
              <span data-value-path="${companyPath}">${introValue.parties.company}</span>
            </div>`
          );
        }
      }
    }
    // --- END: Handle INTRODUCTION section ---

    // Process the rest of the sections
    sectionOrder
      .filter(
        (section) =>
          section !== "INVESTMENT AGREEMENT" && section !== "INTRODUCTION"
      )
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
      // Special handling for signature blocks
      if (key === "signature_blocks" && Array.isArray(value)) {
        handleSignatureBlocks(currentPath, value, marginLeft + 20);
        return;
      }

      let keys = Object.keys(value);
      if (key === "AGREEMENT") {
        const actualKeys = Object.keys(value);
        keys = agreementSectionOrder
          .filter((k) => actualKeys.includes(k))
          .concat(actualKeys.filter((k) => !agreementSectionOrder.includes(k)));
      }

      keys.forEach((subKey) => {
        const subValue = value[subKey];
        const subPath = `${currentPath}.${subKey}`;
        const subMarginLeft = marginLeft + 40;

        if (subValue && typeof subValue === "object") {
          // If object has a title property, render it as a subsection
          if (subValue.title) {
            html.push(
              `<div class="document-line sub-section-title" data-path="${subPath}.title" style="margin-left: ${subMarginLeft}px;">
                <strong>${subKey}: ${subValue.title}</strong>
              </div>`
            );
          }
          // Handle objects with content property
          if (subValue.content !== undefined) {
            // For regular content
            if (typeof subValue.content === "string") {
              html.push(
                `<div class="document-line document-content" data-path="${subPath}.content" style="margin-left: ${subMarginLeft}px;">
                  <span data-value-path="${subPath}.content">
                    ${
                      subKey !== "content" ? `<strong>${subKey}:</strong> ` : ""
                    } ${subValue.content}
                  </span>
                </div>`
              );
            }
            // For array content
            else if (Array.isArray(subValue.content)) {
              html.push(
                `<div class="document-line document-content" data-path="${subPath}.content" style="margin-left: ${subMarginLeft}px;">
                  <strong>${subKey}:</strong>
                </div>`
              );

              subValue.content.forEach((item, idx) => {
                const itemPath = `${subPath}.content.${idx}`;
                html.push(
                  `<div class="document-line document-content" data-value-path="${itemPath}" style="margin-left: ${
                    subMarginLeft + 20
                  }px;">
                    ${item}
                  </div>`
                );
              });
            }

            // Process additional properties (a, b, c, i, ii, etc.)
            for (const propKey in subValue) {
              if (propKey !== "content" && propKey !== "title") {
                const propPath = `${subPath}.${propKey}`;
                const propValue = subValue[propKey];

                if (typeof propValue === "string") {
                  html.push(
                    `<div class="document-line document-content" data-value-path="${propPath}" style="margin-left: ${
                      subMarginLeft + 20
                    }px;">
                      <strong>${propKey}:</strong> ${propValue}
                    </div>`
                  );
                } else if (propValue && typeof propValue === "object") {
                  // Recursively process nested objects
                  processSection(propKey, propValue, level + 2, subPath);
                }
              }
            }
          }
          // For other objects (recursive call)
          else {
            processSection(subKey, subValue, level + 1, currentPath);
          }
        } else if (subValue !== undefined && subValue !== null) {
          // For simple property values
          html.push(
            `<div class="document-line document-content" data-path="${subPath}" style="margin-left: ${subMarginLeft}px;">
              <span>
                <strong>${subKey}:</strong>
                <span data-value-path="${subPath}">${subValue}</span>
              </span>
            </div>`
          );
        }
      });
    } else if (typeof value === "string") {
      // Render simple string value
      html.push(
        `<div class="document-line document-content" data-path="${currentPath}" style="margin-left: ${
          marginLeft + 20
        }px;">
          <span data-value-path="${currentPath}">${value}</span>
        </div>`
      );
    }
  }

  function handleSignatureBlocks(path, blocks, marginLeft) {
    html.push(
      `<div class="signature-section" data-path="${path}" style="margin-left: ${marginLeft}px;">`
    );

    blocks.forEach((block, index) => {
      const blockPath = `${path}.${index}`;
      html.push(
        `<div class="signature-block" data-path="${blockPath}" style="margin-left: ${
          marginLeft + 20
        }px;">`
      );

      if (block.signature_line) {
        html.push(
          `<div class="document-line" data-value-path="${blockPath}.signature_line" style="margin-left: ${
            marginLeft + 40
          }px;">
            ${block.signature_line}
          </div>`
        );
      }

      if (block.name_line) {
        html.push(
          `<div class="document-line" data-value-path="${blockPath}.name_line" style="margin-left: ${
            marginLeft + 40
          }px;">
            ${block.name_line}
          </div>`
        );
      }

      if (block.date_line) {
        html.push(
          `<div class="document-line" data-value-path="${blockPath}.date_line" style="margin-left: ${
            marginLeft + 40
          }px;">
            ${block.date_line}
          </div>`
        );
      }

      html.push(`</div><br/>`);
    });

    html.push(`</div>`);
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
  const container = document.getElementById("keyContainer");
  container.innerHTML = ""; // Clear existing content

  let allQuestionsHTML = "";
  for (let stepNumber = 1; stepNumber <= 6; stepNumber++) {
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
  container.innerHTML = allQuestionsHTML;

  // --- Restore Data ---
  console.log("Restoring form data...");
  let defaultShareholderCountSet = false;
  document
    .querySelectorAll(
      "#keyContainer input, #keyContainer select, #keyContainer textarea"
    )
    .forEach((input) => {
      if (input.id && formDataStore[input.id]) {
        input.value = formDataStore[input.id];
        console.log(`Restored ${input.id} = ${formDataStore[input.id]}`);
        if (input.id === "shareholderCount") defaultShareholderCountSet = true;
      }
    });

  if (!defaultShareholderCountSet) {
    const shareholderCountInput = document.getElementById("shareholderCount");
    if (shareholderCountInput) {
      shareholderCountInput.value = "1";
      formDataStore["shareholderCount"] = "1";
      console.log(`Set default shareholderCount = 1`);
    }
  }
  // --- End Restore Data ---

  // --- Add Handlers ---
  document
    .querySelectorAll(
      "#keyContainer input, #keyContainer select, #keyContainer textarea"
    )
    .forEach((input) => {
      input.addEventListener("input", function () {
        console.log(`Input changed: ${this.id} = ${this.value}`);
        // Store the value with its unique ID
        formDataStore[this.id] = this.value;

        // Special handling for shareholderCount
        if (this.id === "shareholderCount") {
          console.log(`Shareholder count changed to ${this.value}`);

          // Update field visibility
          updateVisibleFields();

          // Update document and preview
          updateDocumentWithFormData(formDataStore);
          updatePreview();

          // Highlight relevant section
          highlightDocumentSection(this.id);
        } else {
          // Update document in real-time for other inputs
          updateDocumentWithFormData(formDataStore);
          updatePreview();
        }
        // Add highlighting on input
        highlightDocumentSection(this.id);
      });
    });

  // Update visibility AFTER all data is restored AND handlers are attached
  console.log("Updating field visibility...");
  updateVisibleFields();

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

      // Add input event to maintain highlighting during editing
      input.addEventListener("input", function () {
        const fieldId = this.id;
        highlightDocumentSection(fieldId);
      });

      // Blur event (when leaving the field)
      input.addEventListener("blur", function () {
        setTimeout(() => {
          if (
            !document.activeElement ||
            !document.activeElement.matches(
              "#keyContainer input, #keyContainer select, #keyContainer textarea"
            )
          ) {
            clearHighlights();
          }
        }, 100);
      });
    });
}

function createQuestionsHTML(stepData) {
  let html = "";

  for (const [key, data] of Object.entries(stepData)) {
    if (key === "title") continue;

    if (typeof data === "object" && !data.type) {
      // This is a group of questions (e.g. shareholder1, shareholder2)
      html += `<div class="question-group" id="${key}-group">`;

      // For each field in this group, prefix its key with the group key
      for (const [fieldKey, fieldData] of Object.entries(data)) {
        const fullKey = `${key}.${fieldKey}`;
        html += createQuestionField(fullKey, fieldData);
      }

      html += "</div>";
    } else {
      // This is a single question
      html += createQuestionField(key, data);
    }
  }
  return html;
}

function createQuestionField(key, data, sectionClass = "") {
  if (!data.question) return ""; // Skip if no question

  let visibilityAttr = "";
  if (data.showIf) {
    const showIfConditions = data.showIf.split("&");
    const conditions = [];

    showIfConditions.forEach((conditionPair) => {
      const [condition, values] = conditionPair.split("=");
      const valueList = values.split(",");
      conditions.push({
        condition: condition,
        values: valueList,
      });
    });

    visibilityAttr = `data-show-conditions='${JSON.stringify(
      conditions
    )}' style="display: none;"`;
    console.log(`Created field with show conditions: ${key}`, conditions);
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
  const affectedPaths = documentPathMap[key]
    ? `data-affects-path="${documentPathMap[key].join(",")}"`
    : "";

  const placeholder = data.placeholder
    ? `placeholder="${data.placeholder}"`
    : "";
  const minAttr = data.min !== undefined ? `min="${data.min}"` : "";
  const maxAttr = data.max !== undefined ? `max="${data.max}"` : "";
  const stepAttr = data.step ? `step="${data.step}"` : "";

  // Create the appropriate input element
  switch (data.type) {
    case "textarea":
      return `<textarea id="${key}" class="form-textarea" ${placeholder} ${affectedPaths}></textarea>`;
    case "date":
      return `<input type="date" id="${key}" ${affectedPaths}>`;
    case "number":
      return `<input type="number" id="${key}" ${placeholder} ${minAttr} ${maxAttr} ${stepAttr} ${affectedPaths}>`;
    case "select":
      return `
        <select id="${key}" ${affectedPaths}>
          <option value="">Select...</option>
          ${data.options
            .map((opt) => `<option value="${opt}">${opt}</option>`)
            .join("")}
        </select>
      `;
    default: // text
      return `<input type="text" id="${key}" ${placeholder} ${affectedPaths}>`;
  }
}

function updateVisibleFields() {
  console.log(
    "Updating visible fields. Current formDataStore:",
    JSON.stringify(formDataStore)
  );

  // Show/hide fields based on conditions
  document.querySelectorAll("[data-show-conditions]").forEach((field) => {
    const conditionsAttr = field.getAttribute("data-show-conditions");
    if (!conditionsAttr) return;

    const fieldId =
      field.querySelector("input, select, textarea")?.id || "group-" + field.id;
    console.log(`Checking field: ${fieldId}, Conditions: ${conditionsAttr}`);

    const conditions = JSON.parse(conditionsAttr);
    let shouldShow = true;

    conditions.forEach((condition) => {
      const controlValue = formDataStore[condition.condition];
      console.log(
        `  Condition: ${condition.condition}, Required Values: ${condition.values}, Actual Value: ${controlValue}`
      );

      if (!controlValue || !condition.values.includes(controlValue)) {
        console.log(`  Condition failed for ${fieldId}`);
        shouldShow = false;
      } else {
        console.log(`  Condition met for ${fieldId}`);
      }
    });

    // Update visibility
    const oldDisplay = field.style.display;
    field.style.display = shouldShow ? "block" : "none";
    if (oldDisplay !== field.style.display) {
      console.log(
        `  Changed display for ${fieldId} from ${oldDisplay} to ${field.style.display}`
      );
    }

    // Clear field values if hidden
    if (!shouldShow) {
      const inputs = field.querySelectorAll("input, select, textarea");
      inputs.forEach((input) => {
        if (formDataStore.hasOwnProperty(input.id)) {
          console.log(`  Hiding and clearing value for ${input.id}`);
          delete formDataStore[input.id];
          input.value = "";
        }
      });
    }
  });
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  // Assume dateStr is in format yyyy-mm-dd
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
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
    Object.keys(window.currentDocument)[0] || "Investment Agreement";

  // --- INTRODUCTION Section ---
  const formattedDate = formData.date
    ? formatDate(formData.date)
    : "*[INSERT DATE]*";
  updatedFlatDoc[
    `${documentTitle}.INTRODUCTION.content`
  ] = `This Investment Agreement ("Agreement") is made and entered into as of ${formattedDate}, by and between:`;

  // INVESTMENT AGREEMENT place
  if (formData.place) {
    updatedFlatDoc[`${documentTitle}.INVESTMENT AGREEMENT.place`] =
      formData.place;
  }

  // --- Shareholders Section ---
  const shareholderCount = parseInt(formData.shareholderCount || "1");
  console.log(`Building shareholders array for count: ${shareholderCount}`);

  // Clear existing shareholders array
  Object.keys(updatedFlatDoc).forEach((key) => {
    if (key.startsWith(`${documentTitle}.INTRODUCTION.parties.shareholders`)) {
      delete updatedFlatDoc[key];
    }
  });

  // Create shareholders array with proper formatting for display
  const shareholders = [];
  for (let i = 1; i <= shareholderCount; i++) {
    // Access the nested properties with dot notation
    const nameKey = `shareholder${i}.name`;
    const addressKey = `shareholder${i}.address`;

    const name = formData[nameKey] || "*[SHAREHOLDER NAME]*";
    const address = formData[addressKey] || "*[SHAREHOLDER ADDRESS]*";

    // Format for display
    shareholders.push(`${name} of ${address}`);

    console.log(`Added shareholder: ${name} of ${address}`);
  }

  // Store as an array in the document
  updatedFlatDoc[`${documentTitle}.INTRODUCTION.parties.shareholders`] =
    shareholders;

  // --- Company Info ---
  if (formData.companyName || formData.companyAddress) {
    const companyName = formData.companyName || "*[COMPANY NAME]*";
    const companyAddress = formData.companyAddress || "*[REGISTERED ADDRESS]*";
    updatedFlatDoc[
      `${documentTitle}.INTRODUCTION.parties.company`
    ] = `${companyName} whose official address is ${companyAddress} (the "Company")`;
  }

  // --- Share Subject to This Agreement ---
  // Update common stock for each shareholder
  for (let i = 1; i <= 4; i++) {
    const nameKey = `shareholder${i}.name`;
    const sharesKey = `shareholder${i}.shares`;

    const shares = formData[sharesKey] || "*[INSERT COMMON STOCK]*";
    const name = formData[nameKey] || "*[SHAREHOLDER NAME]*";

    const letterCode = String.fromCharCode(96 + i); // a, b, c, d
    const path = `${documentTitle}.Share Subject to This Agreement.1.${letterCode}`;

    if (i <= shareholderCount) {
      updatedFlatDoc[path] = `${name}: ${shares}`;
      console.log(`Set shareholder shares: ${path} = "${name}: ${shares}"`);
    } else {
      // Clear unused shareholder entries
      if (updatedFlatDoc[path]) {
        delete updatedFlatDoc[path];
      }
    }
  }

  // --- Management and Control ---
  // Managing Shareholder
  if (formData.managingShareholder) {
    const name = formData.managingShareholder;
    updatedFlatDoc[
      `${documentTitle}.Management and Control.6.a`
    ] = `Except as set forth in this section, ${name}, or his/her duly appointed successor (the "Managing Shareholder") shall manage, control, and operate the business and affairs of the Company as President and General Manager without any further action, or approval by the Shareholders or the Board.`;
    updatedFlatDoc[
      `${documentTitle}.Management and Control.6.b`
    ] = `The Managing Shareholder may be changed from time to time with the Consent of the Shareholders subject to the terms of any employment agreement between the Company and ${name}.`;
  }

  // Officer positions
  if (formData.president) {
    updatedFlatDoc[
      `${documentTitle}.Management and Control.10.b`
    ] = `President: ${formData.president}`;
  }
  if (formData.vicePresident) {
    updatedFlatDoc[
      `${documentTitle}.Management and Control.10.c`
    ] = `Vice President: ${formData.vicePresident}`;
  }
  if (formData.secretary) {
    updatedFlatDoc[
      `${documentTitle}.Management and Control.10.d`
    ] = `Secretary: ${formData.secretary}`;
  }
  if (formData.treasurer) {
    updatedFlatDoc[
      `${documentTitle}.Management and Control.10.e`
    ] = `Treasurer: ${formData.treasurer}`;
  }

  // Restricted powers
  if (formData.restrictedPowers) {
    // First clear existing powers
    for (let i = 1; i <= 4; i++) {
      const romanNum = ["i", "ii", "iii", "iv"][i - 1];
      if (
        updatedFlatDoc[
          `${documentTitle}.Management and Control.6.c.${romanNum}`
        ]
      ) {
        delete updatedFlatDoc[
          `${documentTitle}.Management and Control.6.c.${romanNum}`
        ];
      }
    }

    // Add new powers
    const powers = formData.restrictedPowers
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p);
    powers.forEach((power, index) => {
      if (index < 4) {
        const romanNum = ["i", "ii", "iii", "iv"][index];
        updatedFlatDoc[
          `${documentTitle}.Management and Control.6.c.${romanNum}`
        ] = power;
      }
    });
  }

  // Termination shares price
  if (formData.terminationSharePrice || formData.terminationAmountLimit) {
    const price = formData.terminationSharePrice || "*[AMOUNT]*";
    const limit = formData.terminationAmountLimit || "*[AMOUNT]*";
    updatedFlatDoc[
      `${documentTitle}.Management and Control.11.c`
    ] = `In the event of any such termination, the terminated Shareholder agrees to sell to the Company, and the Company agrees to purchase, in proportion to the shares of the Company then owned by them, the shares of the Company then owned by the terminated Shareholder at a purchase price of $${price} per share, or $${limit}, whichever is less.`;
  }

  // --- Distributions ---
  // Distribution settings
  if (formData.excessIncomeThreshold || formData.distributionFrequency) {
    const threshold = formData.excessIncomeThreshold || "*[AMOUNT]*";
    const frequency = formData.distributionFrequency || "*[frequency]*";
    updatedFlatDoc[
      `${documentTitle}.Distributions.14.a`
    ] = `Unless the Managing Shareholder shall determine in good faith that the Company reasonably needs to retain the same to meet its obligations or to maintain a sound financial condition in light of the Company's reasonable financial needs, the net income of the Company in excess of $${threshold} shall be distributed by the Company ${frequency} proportionate to the percentage of shares owned by each Shareholder.`;
  }

  // --- Legal Terms ---
  // Non-compete duration
  if (formData.noncompeteYears) {
    updatedFlatDoc[
      `${documentTitle}.Noncompetition and Trade Secrets.22.b`
    ] = `Unless otherwise agreed in writing by a majority or the remaining shareholders, a departing Shareholder will not be employed, concerned or financially interested, either directly or indirectly, in the same or a similar business as that conducted by the Company, or that competes with the Company for a period of ${formData.noncompeteYears} year(s) following the date the departing Shareholder conveys his or her shares.`;
  }

  // Governing law
  if (formData.governingLaw) {
    updatedFlatDoc[
      `${documentTitle}.Miscellaneous Provisions.28.content`
    ] = `This Agreement shall be governed by and construed in accordance with the laws of ${formData.governingLaw}.`;
  }

  // --- SIGNATURES Section ---
  // Clear existing signature blocks
  delete updatedFlatDoc[`${documentTitle}.SIGNATURES.signature_blocks`];

  // Get default signature date
  const defaultSignatureDate = formData.signatureDate
    ? formatDate(formData.signatureDate)
    : "*[INSERT DATE]*";

  // Create new signature blocks for shareholders
  const signatureBlocks = [];
  for (let i = 1; i <= shareholderCount; i++) {
    const name = formData[`shareholder${i}.name`] || `*[SHAREHOLDER NAME]*`;

    // Use individual signature date if available, otherwise fall back to default
    const individualSignatureDateKey = `shareholder${i}.signatureDate`;
    const signatureDate = formData[individualSignatureDateKey]
      ? formatDate(formData[individualSignatureDateKey])
      : defaultSignatureDate;

    signatureBlocks.push({
      signature_line: `Shareholder signature: ____________________________`,
      name_line: name,
      date_line: signatureDate,
    });
  }

  // Assign the array of blocks
  updatedFlatDoc[`${documentTitle}.SIGNATURES.signature_blocks`] =
    signatureBlocks;

  console.log("Updated Flat Doc:", updatedFlatDoc);
  return updatedFlatDoc;
}

/**
 * Updates the document object based on the current form data
 * @param {Object} formData - The collected form data
 */
function updateDocumentWithFormData(formData) {
  // Get a clean template to start from
  const cleanTemplate = getDocumentTemplate();
  // Flatten the clean template
  const flatTemplate = flattenObject(cleanTemplate);
  // Apply the current form data to the flattened template
  const updatedFlatDoc = applyFormDataToFlatDocument(flatTemplate, formData);
  // Unflatten the updated document
  window.currentDocument = unflattenObject(updatedFlatDoc);
}

/**
 * Updates the HTML preview based on the current window.currentDocument
 */
function updatePreview() {
  const previewElem = document.getElementById("documentPreview");
  if (!previewElem) {
    console.error("Preview element #documentPreview not found!");
    return;
  }

  try {
    // Ensure currentDocument exists
    if (!window.currentDocument) {
      console.error("window.currentDocument is missing for updatePreview");
      window.currentDocument = { "Investment Agreement": {} };
    }
    // Convert the current document state to HTML
    const html = convertToHtml(window.currentDocument);
    // Update the preview element's content
    previewElem.innerHTML = html;
  } catch (error) {
    console.error("Error updating preview:", error);
    previewElem.innerHTML =
      '<div class="error">Error loading document preview. Check console.</div>';
  }
}

/* --- Utility Functions --- */
function splitPath(path) {
  let parts = path.split(".");
  return parts.map((part) => part.trim());
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
      notification.remove();
    }, 500);
  }, 3000);
}
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
