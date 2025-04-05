// Document order configuration
const sectionOrder = [
  "CONTRACT_HEADER",
  "PARTIES",
  "1. Subject of the Contract",
  "2. Price and Total Amount of the Contract",
  "3. Dates of delivery",
  "4. Quality of the goods",
  "5. Packing and Marking",
  "6. Delivery and Acceptance of Goods",
  "7. Payment",
  "8. Claims",
  "9. Arbitration",
  "10. Force-majeure",
  "11. Other Conditions",
  "12. Legal Addresses of the Parties"
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
 * Utility function to split path with special handling for dot notation
 */
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

/**
 * Helper function for splitPath
 */
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

      keys.forEach((subKey) => {
        const subValue = value[subKey];
        const subMarginLeft = marginLeft + 40;

        // Special handling for marking_fields
        if (subKey === "marking_fields" && typeof subValue === "object") {
          html.push(
            `<div class="document-line" data-path="${currentPath}.${subKey}" style="margin-left: ${subMarginLeft}px;">
              <strong>marking_fields:</strong>
            </div>`
          );
          
          // Process each marking field
          Object.keys(subValue).forEach(fieldKey => {
            const fieldValue = subValue[fieldKey];
            html.push(
              `<div class="document-line document-content" data-path="${currentPath}.${subKey}.${fieldKey}" style="margin-left: ${subMarginLeft + 20}px;">
                <span data-value-path="${currentPath}.${subKey}.${fieldKey}">
                  <strong>${fieldKey}:</strong> ${fieldValue}
                </span>
              </div>`
            );
          });
          
          return; // Skip the normal processing for this subkey
        }

        if (subValue && typeof subValue === "object") {
          if (subValue.content !== undefined) {
            html.push(
              `<div class="document-line document-content" data-path="${currentPath}.${subKey}.content" style="margin-left: ${subMarginLeft}px;">
                                <span data-value-path="${currentPath}.${subKey}.content">
                                    <strong>${subKey}:</strong> ${subValue.content}
                                </span>
                            </div>`
            );

            // Add this block to handle nested properties when there's content
            const nestedKeys = Object.keys(subValue).filter(k => k !== 'content');
            if (nestedKeys.length > 0) {
              nestedKeys.forEach(nestedKey => {
                if (nestedKey === "marking_fields" && typeof subValue[nestedKey] === "object") {
                  // Special handling for marking_fields inside content
                  html.push(
                    `<div class="document-line" data-path="${currentPath}.${subKey}.${nestedKey}" style="margin-left: ${subMarginLeft + 20}px;">
                      <strong>${nestedKey}:</strong>
                    </div>`
                  );
                  
                  // Process each marking field
                  Object.keys(subValue[nestedKey]).forEach(fieldKey => {
                    const fieldValue = subValue[nestedKey][fieldKey];
                    html.push(
                      `<div class="document-line document-content" data-path="${currentPath}.${subKey}.${nestedKey}.${fieldKey}" style="margin-left: ${subMarginLeft + 40}px;">
                        <span data-value-path="${currentPath}.${subKey}.${nestedKey}.${fieldKey}">
                          <strong>${fieldKey}:</strong> ${fieldValue}
                        </span>
                      </div>`
                    );
                  });
                } else {
                  // Normal nested property handling
                  const nestedValue = subValue[nestedKey];
                  html.push(
                    `<div class="document-line document-content" data-path="${currentPath}.${subKey}.${nestedKey}" style="margin-left: ${subMarginLeft + 20}px;">
                      <span data-value-path="${currentPath}.${subKey}.${nestedKey}">
                        <strong>${nestedKey}:</strong> ${nestedValue}
                      </span>
                    </div>`
                  );
                }
              });
            }
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

// Update the document preview 
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

// Predefined questions for document - ordered according to document flow
const documentQuestions = {
  step1: {
    title: "Contract Header",
    contractNumber: {
      question: "Enter the contract number (after 'N')",
      type: "text",
    },
    place: {
      question: "Enter the place of contract",
      type: "text",
    },
    date: {
      question: "Enter the date of contract",
      type: "date",
    },
  },
  step2: {
    title: "Parties Information",
    sellerType: {
      question: "Select type of Seller",
      type: "select",
      options: ["Individual", "Company"],
    },
    seller: {
      individual: {
        name: {
          question: "Enter individual seller's full name",
          type: "text",
          showIf: "sellerType=Individual",
        },
        address: {
          question: "Enter individual seller's address",
          type: "text",
          showIf: "sellerType=Individual",
        },
      },
      company: {
        name: {
          question: "Enter seller company name",
          type: "text",
          showIf: "sellerType=Company",
        },
        regNumber: {
          question: "Enter seller registration number",
          type: "text",
          showIf: "sellerType=Company",
        },
        address: {
          question: "Enter seller company address",
          type: "text",
          showIf: "sellerType=Company",
        },
      },
    },
    buyerType: {
      question: "Select type of Buyer",
      type: "select",
      options: ["Individual", "Company"],
    },
    buyer: {
      individual: {
        name: {
          question: "Enter individual buyer's full name",
          type: "text",
          showIf: "buyerType=Individual",
        },
        address: {
          question: "Enter individual buyer's address",
          type: "text",
          showIf: "buyerType=Individual",
        },
      },
      company: {
        name: {
          question: "Enter buyer company name",
          type: "text",
          showIf: "buyerType=Company",
        },
        regNumber: {
          question: "Enter buyer registration number",
          type: "text",
          showIf: "buyerType=Company",
        },
        address: {
          question: "Enter buyer company address",
          type: "text",
          showIf: "buyerType=Company",
        },
      },
    },
  },
  step3: {
    title: "Subject of the Contract",
    deliveryBasis: {
      question: "Enter delivery basis (e.g. FOB, CIF)",
      type: "text",
    },
    portName: {
      question: "Enter port of delivery",
      type: "text",
    },
    goodsAmount: {
      question: "Enter amount of goods",
      type: "text",
    },
  },
  step4: {
    title: "Price and Delivery",
    priceCurrency: {
      question: "Enter currency for prices",
      type: "text",
    },
    deliveryTerms: {
      question: "Enter delivery terms (FOB, CIF, etc.)",
      type: "text",
    },
    contractAmount: {
      question: "Enter total contract amount",
      type: "text",
    },
    deliverySupplement: {
      question: "Enter supplement number for delivery dates",
      type: "text",
    },
    qualitySupplement: {
      question: "Enter supplement number for quality technical conditions",
      type: "text",
    },
  },
  step5: {
    title: "Packing and Marking",
    caseNumber: {
      question: "Enter case number format",
      type: "text",
    },
    markingContractNumber: {
      question: "Enter contract number format for marking",
      type: "text",
    },
    consignor: {
      question: "Enter consignor details",
      type: "text",
    },
    consignee: {
      question: "Enter consignee details",
      type: "text",
    },
    grossWeight: {
      question: "Enter gross weight format",
      type: "text",
    },
    netWeight: {
      question: "Enter net weight format",
      type: "text",
    },
  },
  step6: {
    title: "Payment Details",
    paymentCurrency: {
      question: "Enter payment currency",
      type: "text",
    },
    bankName: {
      question: "Enter bank name for Letter of Credit",
      type: "text",
    },
    creditValidity: {
      question: "Enter Letter of Credit validity (days)",
      type: "text",
    },
    documentsSubmissionDays: {
      question: "Enter days for document submission after loading",
      type: "text",
    },
  },
  step7: {
    title: "Claims and Arbitration",
    quantityClaimDays: {
      question: "Enter days for quantity claims submission",
      type: "text",
    },
    qualityClaimDays: {
      question: "Enter days for quality claims submission",
      type: "text",
    },
    claimResponseDays: {
      question: "Enter days for seller to consider claims",
      type: "text",
    },
    arbitrationBody: {
      question: "Enter arbitration body name",
      type: "text",
    },
  },
  step8: {
    title: "Force Majeure and Legal Addresses",
    forceMajeureMonths: {
      question: "Enter months after which contract can be terminated in force majeure",
      type: "text",
    },
    sellerAddress: {
      question: "Enter seller's legal address",
      type: "textarea",
    },
    buyerAddress: {
      question: "Enter buyer's legal address",
      type: "textarea",
    },
  },
};

const documentPathMap = {
  // Contract Header
  "contractNumber": ["Foreign Trade Contract.CONTRACT_HEADER.contract_number"],
  "place": ["Foreign Trade Contract.CONTRACT_HEADER.place"],
  "date": ["Foreign Trade Contract.CONTRACT_HEADER.date"],

  // Seller Information
  "sellerType": ["Foreign Trade Contract.PARTIES.seller.content"],
  "seller_individual_name": ["Foreign Trade Contract.PARTIES.seller.content"],
  "seller_individual_address": ["Foreign Trade Contract.PARTIES.seller.content"],
  "seller_company_name": ["Foreign Trade Contract.PARTIES.seller.content"],
  "seller_company_regNumber": ["Foreign Trade Contract.PARTIES.seller.content"],
  "seller_company_address": ["Foreign Trade Contract.PARTIES.seller.content"],
  
  // Buyer Information
  "buyerType": ["Foreign Trade Contract.PARTIES.buyer.content"],
  "buyer_individual_name": ["Foreign Trade Contract.PARTIES.buyer.content"],
  "buyer_individual_address": ["Foreign Trade Contract.PARTIES.buyer.content"],
  "buyer_company_name": ["Foreign Trade Contract.PARTIES.buyer.content"],
  "buyer_company_regNumber": ["Foreign Trade Contract.PARTIES.buyer.content"],
  "buyer_company_address": ["Foreign Trade Contract.PARTIES.buyer.content"],

  // Contract Basic Details
  "deliveryBasis": ["Foreign Trade Contract.1. Subject of the Contract.content.basis"],
  "portName": ["Foreign Trade Contract.1. Subject of the Contract.content.basis"],
  "goodsAmount": ["Foreign Trade Contract.1. Subject of the Contract.content.details"],
  "deliverySupplement": ["Foreign Trade Contract.3. Dates of delivery.3.1.content"],
  "qualitySupplement": ["Foreign Trade Contract.4. Quality of the goods.content"],

  // Packing and Marking
  "caseNumber": ["Foreign Trade Contract.5. Packing and Marking.5.2.marking_fields.case_number"],
  "markingContractNumber": ["Foreign Trade Contract.5. Packing and Marking.5.2.marking_fields.contract_number"],
  "consignor": ["Foreign Trade Contract.5. Packing and Marking.5.2.marking_fields.consignor"],
  "consignee": ["Foreign Trade Contract.5. Packing and Marking.5.2.marking_fields.consignee"],
  "grossWeight": ["Foreign Trade Contract.5. Packing and Marking.5.2.marking_fields.gross_weight"],
  "netWeight": ["Foreign Trade Contract.5. Packing and Marking.5.2.marking_fields.net_weight"],

  // Price and Payment
  "priceCurrency": ["Foreign Trade Contract.2. Price and Total Amount of the Contract.2.1.content"],
  "deliveryTerms": ["Foreign Trade Contract.2. Price and Total Amount of the Contract.2.1.content"],
  "contractAmount": ["Foreign Trade Contract.2. Price and Total Amount of the Contract.2.2.content"],
  "paymentCurrency": ["Foreign Trade Contract.7. Payment.7.1.content"],
  "bankName": ["Foreign Trade Contract.7. Payment.7.1.content"],
  "creditValidity": ["Foreign Trade Contract.7. Payment.7.2.content"],
  "documentsSubmissionDays": ["Foreign Trade Contract.7. Payment.7.3.submission_deadline"],

  // Claims and Force Majeure
  "quantityClaimDays": ["Foreign Trade Contract.8. Claims.8.1.content"],
  "qualityClaimDays": ["Foreign Trade Contract.8. Claims.8.1.content"],
  "claimResponseDays": ["Foreign Trade Contract.8. Claims.8.3.content"],
  "forceMajeureMonths": ["Foreign Trade Contract.10. Force-majeure.10.2.content"],
  "arbitrationBody": ["Foreign Trade Contract.9. Arbitration.content"],

  // Legal Addresses
  "sellerAddress": ["Foreign Trade Contract.12. Legal Addresses of the Parties.seller_address"],
  "buyerAddress": ["Foreign Trade Contract.12. Legal Addresses of the Parties.buyer_address"]
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
  if (!paths || paths.length === 0) return;

  // Find and highlight all elements with matching data-value-path
  const previewElem = document.getElementById("documentPreview");
  paths.forEach(path => {
    // Find elements with this path
    const elements = previewElem.querySelectorAll(`[data-value-path="${path}"]`);
    if (elements.length === 0) {
      // Try finding parent section if exact path not found
      const basePathParts = path.split('.');
      basePathParts.pop(); // Remove the last part (usually "content")
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

  // Delay scrolling by 1ms after highlighting
  setTimeout(() => {
    // Scroll to the first highlighted element
    const firstHighlighted = document.querySelector(".highlighted, .highlighted-section");
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
  const highlightedElements = previewElem.querySelectorAll(".highlighted, .highlighted-section");
  highlightedElements.forEach(element => {
    element.classList.remove("highlighted");
    element.classList.remove("highlighted-section");
  });
}

// Store form data between steps
let formDataStore = {};

/**
 * Shows the questionnaire interface
 */
function showQuestionnaire() {
  // Get the right panel container instead of modal
  const container = document.getElementById("keyContainer");

  // DON'T modify the heading if there's already a save button
  const panelHeading = container.parentElement.querySelector("h2");
  const existingSaveButton = container.parentElement.querySelector("#saveDocBtn");
  
  if (panelHeading && !existingSaveButton) {
    panelHeading.innerHTML =
      'Document Information <button class="btn btn-add" onclick="submitQuestionnaire()">Save Document</button>';
  }

  // Clear existing content
  container.innerHTML = "";

  // Create all steps at once in the container
  let allQuestionsHTML = "";
  for (let stepNumber = 1; stepNumber <= 8; stepNumber++) {
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
        if (this.id === "sellerType" || this.id === "buyerType") {
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
  for (let step = 1; step <= 8; step++) {
    restoreStepData(step);
    registerHighlightEvents();
  }
}

/**
 * Register highlighting events for form fields
 */
function registerHighlightEvents() {
  document.querySelectorAll("#keyContainer input, #keyContainer select, #keyContainer textarea").forEach(input => {
    // Focus event (initial click)
    input.addEventListener("focus", function() {
      const fieldId = this.id;
      highlightDocumentSection(fieldId);
    });

    // Add INPUT event to maintain highlighting during editing
    input.addEventListener("input", function() {
      const fieldId = this.id;
      highlightDocumentSection(fieldId);
    });

    // Blur event (when leaving the field)
    input.addEventListener("blur", function() {
      setTimeout(() => {
        if (!document.activeElement ||
            !document.activeElement.hasAttribute("data-affects-path")) {
          clearHighlights();
        }
      }, 100);
    });
  });
}

/**
 * Creates HTML for questions
 */
function createQuestionsHTML(stepData) {
  let html = "";

  // Add section identifier classes
  const isSellerSection =
    stepData.title && stepData.title.includes("Seller");
  const isBuyerSection =
    stepData.title && stepData.title.includes("Buyer");
  const sectionClass = isSellerSection
    ? "seller-section"
    : isBuyerSection
    ? "buyer-section"
    : "";

  for (const [key, data] of Object.entries(stepData)) {
    if (key === "title") continue;

    if (typeof data === "object" && !data.type) {
      // This is a group of questions - add section class
      const groupClass = key === "seller"
        ? "seller-group"
        : key === "buyer"
        ? "buyer-group"
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

/**
 * Creates HTML for a single question field
 */
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

/**
 * Creates HTML for a form input element
 */
function createInputElement(key, data) {
  // Determine which section and type we're in
  let prefix = "";

  // Extract context from showIf
  const dataShowIf = data.showIf || "";
  if (dataShowIf.includes("sellerType=")) {
    const type = dataShowIf.split("=")[1].toLowerCase();
    prefix = `seller_${type}_`;
  } else if (dataShowIf.includes("buyerType=")) {
    const type = dataShowIf.split("=")[1].toLowerCase();
    prefix = `buyer_${type}_`;
  }

  // Create full ID
  const fullId = prefix ? prefix + key : key;

  // Get affected paths for data attribute
  const affectedPaths = documentPathMap[fullId] ?
      `data-affects-path="${documentPathMap[fullId].join(',')}"` : "";

  // Handle type selectors
  if (key === "sellerType" || key === "buyerType") {
    return `
      <select id="${key}" onchange="handlePartyTypeChange(this)" ${affectedPaths}>
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
      return `<textarea id="${fullId}" class="form-textarea" data-original-key="${key}" ${affectedPaths}></textarea>`;
    case "date":
      return `<input type="date" id="${fullId}" data-original-key="${key}" ${affectedPaths}>`;
    case "select":
      return `
        <select id="${fullId}" data-original-key="${key}" ${affectedPaths}>
          <option value="">Select...</option>
          ${data.options
            .map((opt) => `<option value="${opt}">${opt}</option>`)
            .join("")}
        </select>
      `;
    default:
      return `<input type="text" id="${fullId}" data-original-key="${key}" ${affectedPaths}>`;
  }
}

/**
 * Handles field change events
 */
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

/**
 * Handle party type change and display appropriate fields
 */
function handlePartyTypeChange(selectElement) {
  const isSeller = selectElement.id === "sellerType";
  const isBuyer = selectElement.id === "buyerType";
  const selectedType = selectElement.value;

  if (!selectedType) return;

  // Clear previous values for other types from formDataStore
  const prefix = isSeller ? "seller_" : "buyer_";
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

  // Focus on the first visible field for that party type
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
 * Save step data to formDataStore
 */
function saveStepData(stepNumber) {
  document.querySelectorAll("input, select, textarea").forEach((input) => {
    if (input.id && input.value) {
      formDataStore[input.id] = input.value;
    }
  });
}

/**
 * Restore step data from formDataStore
 */
function restoreStepData(stepNumber) {
  // Restore all saved values for this step
  document.querySelectorAll("input, select, textarea").forEach((input) => {
    if (input.id && formDataStore[input.id]) {
      input.value = formDataStore[input.id];

      // Handle conditional field visibility
      if (input.tagName === "SELECT") {
        if (input.id === "sellerType" || input.id === "buyerType") {
          handlePartyTypeChange(input);
        } else {
          handleFieldChange(input);
        }
      }
    }
  });
}

/**
 * Submit the questionnaire form
 */
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

/**
 * Format date for display
 */
function formatDate(dateStr) {
  // Assume dateStr is in format yyyy-mm-dd
  if (!dateStr) return "";
  
  const [year, month, day] = dateStr.split("-");
  const monthNames = ["January", "February", "March", "April", "May", "June", 
                      "July", "August", "September", "October", "November", "December"];
  
  return `"${day}" ${monthNames[parseInt(month) - 1]} ${year}`;
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
    Object.keys(window.currentDocument)[0] || "Foreign Trade Contract";

  // Contract Header
  if (formData.contractNumber) {
    updatedFlatDoc[`${documentTitle}.CONTRACT_HEADER.contract_number`] = `CONTRACT N ${formData.contractNumber}`;
  }
  
  if (formData.place) {
    updatedFlatDoc[`${documentTitle}.CONTRACT_HEADER.place`] = formData.place;
  }

  if (formData.date) {
    updatedFlatDoc[`${documentTitle}.CONTRACT_HEADER.date`] = formatDate(formData.date);
  }

  // Seller Information - Create full seller info based on type
  if (formData.sellerType === "Individual" && 
      (formData.seller_individual_name || formData.seller_individual_address)) {
    const name = formData.seller_individual_name || "___________";
    const address = formData.seller_individual_address || "___________";
    
    updatedFlatDoc[`${documentTitle}.PARTIES.seller.content`] = 
      `${name} of ${address} hereinafter referred to as the Seller, on the one hand`;
  } 
  else if (formData.sellerType === "Company" && 
          (formData.seller_company_name || formData.seller_company_regNumber || formData.seller_company_address)) {
    const name = formData.seller_company_name || "___________";
    const regNumber = formData.seller_company_regNumber || "___________";
    const address = formData.seller_company_address || "___________";
    
    updatedFlatDoc[`${documentTitle}.PARTIES.seller.content`] = 
      `${name}, a company registered under number ${regNumber} at ${address} hereinafter referred to as the Seller, on the one hand`;
  }

  // Buyer Information - Create full buyer info based on type
  if (formData.buyerType === "Individual" && 
      (formData.buyer_individual_name || formData.buyer_individual_address)) {
    const name = formData.buyer_individual_name || "___________";
    const address = formData.buyer_individual_address || "___________";
    
    updatedFlatDoc[`${documentTitle}.PARTIES.buyer.content`] = 
      `${name} of ${address} hereinafter referred to as the Buyer, on the other hand`;
  } 
  else if (formData.buyerType === "Company" && 
          (formData.buyer_company_name || formData.buyer_company_regNumber || formData.buyer_company_address)) {
    const name = formData.buyer_company_name || "___________";
    const regNumber = formData.buyer_company_regNumber || "___________";
    const address = formData.buyer_company_address || "___________";
    
    updatedFlatDoc[`${documentTitle}.PARTIES.buyer.content`] = 
      `${name}, a company registered under number ${regNumber} at ${address} hereinafter referred to as the Buyer, on the other hand`;
  }

  // Contract Subject - Only replace specific placeholders
  if (formData.deliveryBasis || formData.portName) {
    const originalBasis = updatedFlatDoc[`${documentTitle}.1. Subject of the Contract.content.basis`] ||
      "The Seller has sold and the Buyer has bought on (_____________)___________________________ (port)";
    
    let updatedBasis = originalBasis;
    
    if (formData.deliveryBasis) {
      updatedBasis = updatedBasis.replace("_____________", formData.deliveryBasis);
    }
    
    if (formData.portName) {
      updatedBasis = updatedBasis.replace("___________________________", formData.portName);
    }
    
    updatedFlatDoc[`${documentTitle}.1. Subject of the Contract.content.basis`] = updatedBasis;
  }

  if (formData.goodsAmount) {
    const originalDetails = updatedFlatDoc[`${documentTitle}.1. Subject of the Contract.content.details`] ||
      "basis the goods to the amount of _________________________, in the quantity, assortment, at prices and according to technical conditions, as stated in Supplements N 1, 2... which are the integral parts of the present Contract.";
    
    updatedFlatDoc[`${documentTitle}.1. Subject of the Contract.content.details`] = 
      originalDetails.replace("_________________________", formData.goodsAmount);
  }

  // Price and Currency - Only replace specific placeholders
  if (formData.priceCurrency || formData.deliveryTerms) {
    const originalPriceContent = updatedFlatDoc[`${documentTitle}.2. Price and Total Amount of the Contract.2.1.content`] ||
      "The prices for the goods are fixed in _________________________(currency) and are understood _____________ _____________________ (FOB, CIF...), packing and marking included.";
    
    let updatedPriceContent = originalPriceContent;
    
    if (formData.priceCurrency) {
      updatedPriceContent = updatedPriceContent.replace("_________________________(currency)", formData.priceCurrency);
    }
    
    if (formData.deliveryTerms) {
      updatedPriceContent = updatedPriceContent.replace("_____________ _____________________", formData.deliveryTerms);
    }
    
    updatedFlatDoc[`${documentTitle}.2. Price and Total Amount of the Contract.2.1.content`] = updatedPriceContent;
  }

  if (formData.contractAmount) {
    const originalAmount = updatedFlatDoc[`${documentTitle}.2. Price and Total Amount of the Contract.2.2.content`] ||
      "The Total Amount of the present Contract is _________________________.";
    
    updatedFlatDoc[`${documentTitle}.2. Price and Total Amount of the Contract.2.2.content`] = 
      originalAmount.replace("_________________________", formData.contractAmount);
  }

  // Delivery Dates
  if (formData.deliverySupplement) {
    const originalDelivery = updatedFlatDoc[`${documentTitle}.3. Dates of delivery.3.1.content`] ||
      "Delivery of the goods under the present Contract should be effected within the dates stipulated in the Supplement N _________ to the present Contract.";
    
    updatedFlatDoc[`${documentTitle}.3. Dates of delivery.3.1.content`] = 
      originalDelivery.replace("_________", formData.deliverySupplement);
  }

  // Quality
  if (formData.qualitySupplement) {
    const originalQuality = updatedFlatDoc[`${documentTitle}.4. Quality of the goods.content`] ||
      "The quality of the goods should conform to the technical conditions stated in the Supplement N _______.";
    
    updatedFlatDoc[`${documentTitle}.4. Quality of the goods.content`] = 
      originalQuality.replace("_______", formData.qualitySupplement);
  }

  // Packing and Marking
  if (formData.caseNumber) {
    updatedFlatDoc[`${documentTitle}.5. Packing and Marking.5.2.marking_fields.case_number`] = 
      `Case N ${formData.caseNumber}`;
  }

  if (formData.markingContractNumber) {
    updatedFlatDoc[`${documentTitle}.5. Packing and Marking.5.2.marking_fields.contract_number`] = 
      `Contract N ${formData.markingContractNumber}`;
  }

  if (formData.consignor) {
    updatedFlatDoc[`${documentTitle}.5. Packing and Marking.5.2.marking_fields.consignor`] = 
      `Consignor ${formData.consignor}`;
  }

  if (formData.consignee) {
    updatedFlatDoc[`${documentTitle}.5. Packing and Marking.5.2.marking_fields.consignee`] = 
      `Consignee ${formData.consignee}`;
  }

  if (formData.grossWeight) {
    updatedFlatDoc[`${documentTitle}.5. Packing and Marking.5.2.marking_fields.gross_weight`] = 
      `Gross weight ${formData.grossWeight}`;
  }

  if (formData.netWeight) {
    updatedFlatDoc[`${documentTitle}.5. Packing and Marking.5.2.marking_fields.net_weight`] = 
      `Net weight ${formData.netWeight}`;
  }

  // Payment - Only replace specific placeholders
  if (formData.paymentCurrency || formData.bankName) {
    const originalPayment = updatedFlatDoc[`${documentTitle}.7. Payment.7.1.content`] ||
      "Payment for the goods delivered is effected in _____________________ (currency) under an irrevocable, confirmed divisible Letter of Credit established by the Buyer with the Bank _________________________.";
    
    let updatedPayment = originalPayment;
    
    if (formData.paymentCurrency) {
      updatedPayment = updatedPayment.replace("_____________________ (currency)", formData.paymentCurrency);
    }
    
    if (formData.bankName) {
      updatedPayment = updatedPayment.replace("_________________________", formData.bankName);
    }
    
    updatedFlatDoc[`${documentTitle}.7. Payment.7.1.content`] = updatedPayment;
  }

  if (formData.creditValidity) {
    const originalCredit = updatedFlatDoc[`${documentTitle}.7. Payment.7.2.content`] ||
      "The Letter of Credit is to allow overloading and partial shipment and to stipulate that all the expenses connected with the establishment and the extension of the Latter of Credit and any other bank charges to be for the Buyers'account. The Letter of Credit is to be valid for________ days.";
    
    updatedFlatDoc[`${documentTitle}.7. Payment.7.2.content`] = 
      originalCredit.replace("for________", "for ________").replace("________", formData.creditValidity);
  }

  if (formData.documentsSubmissionDays) {
    const originalSubmission = updatedFlatDoc[`${documentTitle}.7. Payment.7.3.submission_deadline`] ||
      "The Seller should submit the above-stated documents to the Bank for payment within _____________ days after loading of the goods.";
    
    updatedFlatDoc[`${documentTitle}.7. Payment.7.3.submission_deadline`] = 
      originalSubmission.replace("_____________", formData.documentsSubmissionDays);
  }

  // Claims - Only replace specific placeholders
  if (formData.quantityClaimDays || formData.qualityClaimDays) {
    const originalClaims = updatedFlatDoc[`${documentTitle}.8. Claims.8.1.content`] ||
      "Claims in respect of the quantity in case of shortage inside the case may be submitted by the Buyer to the Seller within __________________ days and in respect of the quality of the goods in case of non-conformity of same to that stipulated by the Contract - not after than ____ days after the arrival of the goods at the port of destination.";
    
    let updatedClaims = originalClaims;
    
    if (formData.quantityClaimDays) {
      updatedClaims = updatedClaims.replace("__________________", formData.quantityClaimDays);
    }
    
    if (formData.qualityClaimDays) {
      updatedClaims = updatedClaims.replace("____", formData.qualityClaimDays);
    }
    
    updatedFlatDoc[`${documentTitle}.8. Claims.8.1.content`] = updatedClaims;
  }

  if (formData.claimResponseDays) {
    const originalResponse = updatedFlatDoc[`${documentTitle}.8. Claims.8.3.content`] ||
      "The Sellers should consider the received claim within _________ days after the date of its receipt.";
    
    updatedFlatDoc[`${documentTitle}.8. Claims.8.3.content`] = 
      originalResponse.replace("_________", formData.claimResponseDays);
  }

  // Arbitration
  if (formData.arbitrationBody) {
    const originalArbitration = updatedFlatDoc[`${documentTitle}.9. Arbitration.content`] ||
      "All disputes and differences which may arise out of the present Contract or in connection with the same are to be settled without application to State courts by _________________________, in accordance with the Rules of procedure of the said Court the awards of which are final and binding upon both Parties.";
    
    updatedFlatDoc[`${documentTitle}.9. Arbitration.content`] = 
      originalArbitration.replace("_________________________", formData.arbitrationBody);
  }

  // Force Majeure
  if (formData.forceMajeureMonths) {
    const originalForce = updatedFlatDoc[`${documentTitle}.10. Force-majeure.10.2.content`] ||
      "Should the above circumstances continue to be in force for more than ______ months, each Party shall have the right to refuse any further fulfilment of the obligations under the Contract and in such case neither of the Parties shall have the right to make a demand upon the other Party for the compensation of any possible damages.";
    
    updatedFlatDoc[`${documentTitle}.10. Force-majeure.10.2.content`] = 
      originalForce.replace("______", formData.forceMajeureMonths);
  }

  // Legal Addresses - Replace entire field
  if (formData.sellerAddress) {
    updatedFlatDoc[`${documentTitle}.12. Legal Addresses of the Parties.seller_address`] = formData.sellerAddress;
  }

  if (formData.buyerAddress) {
    updatedFlatDoc[`${documentTitle}.12. Legal Addresses of the Parties.buyer_address`] = formData.buyerAddress;
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
}

/**
 * Export to Word document
 */
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
  const highlighted = element.querySelectorAll('.highlighted, .highlighted-section');
  highlighted.forEach(el => {
    el.classList.remove('highlighted');
    el.classList.remove('highlighted-section');
  });

  // 2. Fix heading format (remove ##### and other markdown-like symbols)
  const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach(heading => {
    heading.textContent = heading.textContent.replace(/^#+\s*/, '');
  });

  // 3. Remove labels like "content:", "option1:", etc.
  const spans = element.querySelectorAll('span[data-value-path]');
  spans.forEach(span => {
    const text = span.textContent;
    const labelMatch = text.match(/^([a-zA-Z0-9]+):\s*(.*)/);
    if (labelMatch && labelMatch[1] &&
        (labelMatch[1].toLowerCase() === 'content' ||
         labelMatch[1].toLowerCase().includes('option'))) {
      span.textContent = labelMatch[2];
    }
  });

  // 4. Set consistent margins and indentation
  const sections = element.querySelectorAll('.document-line');
  sections.forEach(section => {
    section.style.marginLeft = '0';
  });

  // 5. Fix numbering format (add proper indentation for numbered clauses)
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

  // 6. Apply consistent font sizes
  // Main title
  const titleElements = element.querySelectorAll('.document-title');
  titleElements.forEach(el => {
    el.style.fontSize = '14pt';
    const strongs = el.querySelectorAll('strong');
    strongs.forEach(s => s.style.fontSize = '14pt');
  });

  // Main sections
  const mainSections = element.querySelectorAll('.main-section h5');
  mainSections.forEach(el => {
    el.style.fontSize = '12pt';
    const strongs = el.querySelectorAll('strong');
    strongs.forEach(s => s.style.fontSize = '12pt');
  });

  // Sub-sections and content - all 10pt
  const subSections = element.querySelectorAll('.sub-section h6, .document-content');
  subSections.forEach(el => {
    el.style.fontSize = '10pt';
    const strongs = el.querySelectorAll('strong');
    strongs.forEach(s => s.style.fontSize = '10pt');
  });
}

// Document initialization
document.addEventListener("DOMContentLoaded", function () {
  console.log("Document initialization started");
  if (!window.currentDocument) {
    console.error("No document found in window.currentDocument");
    window.currentDocument = { "Foreign Trade Contract": {} };
  }

  try {
    // Initialize the document template
    initializeDocumentTemplate();

    // Show the questionnaire
    showQuestionnaire();
    
    // Update the preview
    updatePreview();

    console.log("Document initialization completed");
  } catch (error) {
    console.error("Error during initialization:", error);
  }
});

// Export functions to global scope
window.downloadWordDocx = downloadWordDocx;
window.showQuestionnaire = showQuestionnaire;
window.submitQuestionnaire = submitQuestionnaire;
window.handleFieldChange = handleFieldChange;
window.handlePartyTypeChange = handlePartyTypeChange;
window.highlightDocumentSection = highlightDocumentSection;
window.clearHighlights = clearHighlights;
