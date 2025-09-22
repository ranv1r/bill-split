class BillSplitter {
    constructor() {
        this.people = [];
        this.items = [];
        this.currentImageUrl = null;
        this.currentFileType = null;
        this.currentFile = null;
        this.taxRates = [
            { id: 1, name: 'GST', rate: 5.00 },
            { id: 2, name: 'PLT', rate: 10.00 }
        ];
        this.nextTaxId = 3;
        this.tipRate = 20.00;
        this.initializeEventListeners();
        this.renderTaxRates();
    }

    initializeEventListeners() {
        // File upload handling
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // OCR processing
        document.getElementById('processBtn').addEventListener('click', this.processWithOCR.bind(this));

        // People management
        document.getElementById('addPersonBtn').addEventListener('click', this.addPerson.bind(this));
        document.getElementById('personName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addPerson();
        });

        // Item management
        document.getElementById('addItemBtn').addEventListener('click', this.addManualItem.bind(this));

        // Tax and tip configuration
        document.getElementById('addTaxRateBtn').addEventListener('click', this.addTaxRate.bind(this));
        document.getElementById('tipRate').addEventListener('change', this.updateTipRate.bind(this));
    }

    handleDragOver(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.uploadFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.uploadFile(file);
        }
    }

    async uploadFile(file) {
        const formData = new FormData();
        formData.append('receipt', file);

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (result.success) {
                this.currentImageUrl = result.path;
                this.currentFileType = file.type;
                this.currentFile = file;
                this.displayUploadedImage(result.path, file.type);
            }
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Failed to upload image. Please try again.');
        }
    }

    async displayUploadedImage(imagePath, fileType) {
        const uploadArea = document.getElementById('uploadArea');
        const uploadedImage = document.getElementById('uploadedImage');
        const imgPreview = document.getElementById('receiptPreview');
        const pdfCanvas = document.getElementById('pdfCanvas');

        if (fileType === 'application/pdf') {
            // Handle PDF display
            imgPreview.style.display = 'none';
            pdfCanvas.style.display = 'block';
            await this.renderPDF(imagePath);
        } else {
            // Handle image display
            pdfCanvas.style.display = 'none';
            imgPreview.style.display = 'block';
            imgPreview.src = imagePath;
        }

        uploadArea.style.display = 'none';
        uploadedImage.style.display = 'block';

        // Show sections in order
        document.getElementById('summarySection').style.display = 'block';
        document.getElementById('settingsSection').style.display = 'block';
        document.getElementById('peopleSection').style.display = 'block';
    }

    async renderPDF(pdfPath) {
        try {
            if (!window.pdfjsLib) {
                console.error('PDF.js not loaded');
                return;
            }

            const loadingTask = pdfjsLib.getDocument(pdfPath);
            const pdf = await loadingTask.promise;
            const page = await pdf.getPage(1); // Get first page

            const canvas = document.getElementById('pdfCanvas');
            const context = canvas.getContext('2d');

            const viewport = page.getViewport({ scale: 1.5 });
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };

            await page.render(renderContext).promise;
        } catch (error) {
            console.error('Error rendering PDF:', error);
            alert('Error displaying PDF. Please try uploading an image instead.');
        }
    }

    async processWithOCR() {
        const modal = document.getElementById('ocrModal');
        modal.style.display = 'flex';

        try {
            // Load Tesseract.js from CDN
            if (!window.Tesseract) {
                await this.loadTesseract();
            }

            let ocrSource;

            // Determine OCR source based on file type
            if (this.currentFileType === 'application/pdf') {
                // Use the rendered canvas for PDF OCR
                ocrSource = document.getElementById('pdfCanvas');
            } else {
                // Use the image element for image files
                ocrSource = document.getElementById('receiptPreview');
            }

            console.log('Starting OCR processing...');
            const { data: { text } } = await Tesseract.recognize(
                ocrSource,
                'eng',
                {
                    logger: m => {
                        console.log(m);
                        if (m.status === 'recognizing text') {
                            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                        }
                    }
                }
            );

            console.log('OCR completed. Extracted text:', text);
            modal.style.display = 'none';
            this.parseReceiptText(text);
            this.showItemsSection();

        } catch (error) {
            modal.style.display = 'none';
            console.error('OCR failed:', error);
            console.error('Error details:', error.message, error.stack);
            alert('OCR processing failed. You can still add items manually.');
            this.showItemsSection();
        }
    }

    loadTesseract() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/tesseract.js@v5.0.4/dist/tesseract.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    parseReceiptText(text) {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);

        // Extract tax rates from receipt and update existing tax rates
        for (const line of lines) {
            const gstMatch = line.match(/TAX\s+GST\s+(\d+)%/i);
            if (gstMatch) {
                const gstTax = this.taxRates.find(tax => tax.name === 'GST');
                if (gstTax) {
                    gstTax.rate = parseFloat(gstMatch[1]);
                }
            }

            const pltMatch = line.match(/TAX\s+PLT\s+(\d+)%/i);
            if (pltMatch) {
                const pltTax = this.taxRates.find(tax => tax.name === 'PLT');
                if (pltTax) {
                    pltTax.rate = parseFloat(pltMatch[1]);
                }
            }
        }

        // Re-render tax rates to reflect any updates
        this.renderTaxRates();

        // Extract items
        for (const line of lines) {
            // Enhanced pattern matching for items with prices
            const priceMatch = line.match(/^(\d+)?\s*(.+?)\s+(\d+\.?\d*)$/);
            if (priceMatch) {
                const quantity = priceMatch[1] ? parseInt(priceMatch[1]) : 1;
                let itemName = priceMatch[2].trim();
                const price = parseFloat(priceMatch[3]);

                // Clean up item name
                itemName = itemName.replace(/^(WED|DB|POP|SPCL|BLACKEND|LETTUC|TRUFFLE|SUSHI)\s*/i, '');
                itemName = itemName.replace(/\s*~~\s*/, ' ');

                if (itemName && price && price > 0 && !itemName.toLowerCase().includes('subtotal') &&
                    !itemName.toLowerCase().includes('total') && !itemName.toLowerCase().includes('tax')) {

                    // Determine tax applicability based on item type
                    const isAlcohol = /amaretto|beer|wine|liquor/i.test(itemName);
                    const applicableTaxes = {};

                    // Apply default taxes
                    this.taxRates.forEach(tax => {
                        if (tax.name === 'GST') {
                            applicableTaxes[tax.id] = true; // GST applies to most items
                        } else if (tax.name === 'PLT') {
                            applicableTaxes[tax.id] = isAlcohol; // PLT applies to alcohol
                        } else {
                            applicableTaxes[tax.id] = false; // Other taxes default to false
                        }
                    });

                    this.items.push({
                        name: itemName,
                        price: price,
                        quantity: quantity,
                        applicableTaxes: applicableTaxes,
                        assignedPeople: []
                    });
                }
            }
        }

        this.renderItems();
    }

    addPerson() {
        const input = document.getElementById('personName');
        const name = input.value.trim();

        if (name && !this.people.includes(name)) {
            this.people.push(name);
            input.value = '';
            this.renderPeople();
            this.renderItems(); // Update item checkboxes
        }
    }

    removePerson(name) {
        this.people = this.people.filter(person => person !== name);
        // Remove person from all items
        this.items.forEach(item => {
            item.assignedPeople = item.assignedPeople.filter(person => person !== name);
        });
        this.renderPeople();
        this.renderItems();
        this.updateSummary();
    }

    renderPeople() {
        const container = document.getElementById('peopleList');
        container.innerHTML = this.people.map(person => `
            <div class="person-tag">
                ${person}
                <button class="remove-person" onclick="billSplitter.removePerson('${person}')">×</button>
            </div>
        `).join('');
    }

    addManualItem() {
        const applicableTaxes = {};
        this.taxRates.forEach(tax => {
            applicableTaxes[tax.id] = false; // Default all taxes to false for manual items
        });

        this.items.push({
            name: 'New Item',
            price: 0.00,
            quantity: 1,
            applicableTaxes: applicableTaxes,
            assignedPeople: []
        });
        this.renderItems();
    }

    addTaxRate() {
        this.taxRates.push({
            id: this.nextTaxId++,
            name: `Tax ${this.taxRates.length + 1}`,
            rate: 0.00
        });

        // Add this tax to all existing items (defaulted to false)
        this.items.forEach(item => {
            item.applicableTaxes[this.taxRates[this.taxRates.length - 1].id] = false;
        });

        this.renderTaxRates();
        this.renderItemsTableHeader();
        this.renderItems();
    }

    removeTaxRate(taxId) {
        this.taxRates = this.taxRates.filter(tax => tax.id !== taxId);

        // Remove this tax from all items
        this.items.forEach(item => {
            delete item.applicableTaxes[taxId];
        });

        this.renderTaxRates();
        this.renderItemsTableHeader();
        this.renderItems();
    }

    updateTaxRate(taxId, field, value) {
        const tax = this.taxRates.find(t => t.id === taxId);
        if (tax) {
            tax[field] = value;
            this.renderItems(); // Recalculate totals
        }
    }

    updateTipRate() {
        this.tipRate = parseFloat(document.getElementById('tipRate').value) || 0;
        this.renderItems();
    }

    renderTaxRates() {
        const container = document.getElementById('taxRatesContainer');
        container.innerHTML = this.taxRates.map(tax => `
            <div class="tax-rate-config">
                <div class="setting-group">
                    <input type="text" value="${tax.name}"
                           onchange="billSplitter.updateTaxRate(${tax.id}, 'name', this.value)"
                           placeholder="Tax Name" style="width: 120px;">
                    <input type="number" value="${this.formatCurrency(tax.rate)}" step="0.01" min="0" max="100"
                           onchange="billSplitter.updateTaxRate(${tax.id}, 'rate', parseFloat(this.value))"
                           style="width: 80px; text-align: right;">
                    <span>%</span>
                    <button class="btn btn-danger" onclick="billSplitter.removeTaxRate(${tax.id})"
                            style="padding: 4px 8px; font-size: 0.8rem;">Remove</button>
                </div>
            </div>
        `).join('');
    }

    renderItemsTableHeader() {
        const thead = document.getElementById('itemsTableHead');
        const taxHeaders = this.taxRates.map(tax => `<th>${tax.name}</th>`).join('');

        thead.innerHTML = `
            <tr>
                <th>Item Name</th>
                <th>Qty</th>
                <th>Amount</th>
                ${taxHeaders}
                <th>Total</th>
                <th>Actions</th>
            </tr>
        `;
    }

    formatCurrency(amount) {
        return amount.toFixed(2);
    }

    removeItem(index) {
        this.items.splice(index, 1);
        this.renderItems();
        this.updateSummary();
    }

    renderItems() {
        this.renderItemsTableHeader(); // Update header in case tax rates changed

        const tbody = document.getElementById('itemsTableBody');
        const taxColumns = this.taxRates.length;

        tbody.innerHTML = this.items.map((item, index) => {
            const itemTotal = this.calculateItemTotal(item);
            const taxCheckboxes = this.taxRates.map(tax => `
                <td>
                    <input type="checkbox" ${item.applicableTaxes[tax.id] ? 'checked' : ''}
                           onchange="billSplitter.updateItemTax(${index}, ${tax.id}, this.checked)">
                </td>
            `).join('');

            return `
                <tr>
                    <td>
                        <input type="text" value="${item.name}"
                               onchange="billSplitter.updateItemProperty(${index}, 'name', this.value)"
                               placeholder="Item name">
                    </td>
                    <td>
                        <input type="number" value="${item.quantity}" min="1"
                               onchange="billSplitter.updateItemProperty(${index}, 'quantity', parseInt(this.value))"
                               style="width: 60px;">
                    </td>
                    <td>
                        $<input type="number" value="${this.formatCurrency(item.price)}" step="0.01" min="0"
                               onchange="billSplitter.updateItemProperty(${index}, 'price', parseFloat(this.value))"
                               style="width: 80px;">
                    </td>
                    ${taxCheckboxes}
                    <td class="item-total">$${this.formatCurrency(itemTotal)}</td>
                    <td>
                        <button class="btn btn-danger" onclick="billSplitter.removeItem(${index})">Remove</button>
                    </td>
                </tr>
                <tr>
                    <td colspan="${3 + taxColumns + 2}">
                        <div class="people-assignment">
                            <strong>Assigned to:</strong>
                            <div class="people-assignment-row">
                                ${this.people.map(person => `
                                    <div class="checkbox-item">
                                        <input type="checkbox" id="item_${index}_${person}"
                                               ${item.assignedPeople.includes(person) ? 'checked' : ''}
                                               onchange="billSplitter.togglePersonForItem(${index}, '${person}', this.checked)">
                                        <label for="item_${index}_${person}">${person}</label>
                                    </div>
                                `).join('')}
                            </div>
                            ${item.assignedPeople.length > 0 ?
                                `<div style="margin-top: 8px; font-weight: bold; color: #4facfe;">
                                    Per person: $${this.formatCurrency(this.calculateItemTotalPerPerson(item))}
                                </div>` : ''
                            }
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        this.updateSummary();
    }

    updateItemTax(itemIndex, taxId, isChecked) {
        this.items[itemIndex].applicableTaxes[taxId] = isChecked;
        this.renderItems();
    }

    updateItemProperty(index, property, value) {
        this.items[index][property] = value;
        this.renderItems();
    }

    togglePersonForItem(itemIndex, person, isChecked) {
        const item = this.items[itemIndex];
        if (isChecked) {
            if (!item.assignedPeople.includes(person)) {
                item.assignedPeople.push(person);
            }
        } else {
            item.assignedPeople = item.assignedPeople.filter(p => p !== person);
        }
        this.updateSummary();
    }

    calculateItemTotal(item) {
        const subtotal = item.price * item.quantity;
        let totalTax = 0;

        // Apply each configured tax rate based on item's applicable taxes
        this.taxRates.forEach(tax => {
            if (item.applicableTaxes[tax.id]) {
                totalTax += subtotal * (tax.rate / 100);
            }
        });

        const tip = subtotal * (this.tipRate / 100);
        return subtotal + totalTax + tip;
    }

    calculateItemTotalPerPerson(item) {
        if (item.assignedPeople.length === 0) return 0;
        return this.calculateItemTotal(item) / item.assignedPeople.length;
    }

    showItemsSection() {
        document.getElementById('itemsSection').style.display = 'block';
        document.getElementById('summarySection').style.display = 'block';
        this.renderItems();
    }

    updateSummary() {
        const summary = {};
        let grandTotal = 0;
        let totalSubtotal = 0;
        const taxTotals = {};
        let totalTip = 0;

        // Initialize tax totals
        this.taxRates.forEach(tax => {
            taxTotals[tax.id] = 0;
        });

        // Initialize summary for each person
        this.people.forEach(person => {
            summary[person] = 0;
        });

        // Calculate each person's share and bill breakdown
        this.items.forEach(item => {
            const subtotal = item.price * item.quantity;
            totalSubtotal += subtotal;

            // Calculate tax totals for each configured tax
            this.taxRates.forEach(tax => {
                if (item.applicableTaxes[tax.id]) {
                    taxTotals[tax.id] += subtotal * (tax.rate / 100);
                }
            });

            totalTip += subtotal * (this.tipRate / 100);

            const totalPerPerson = this.calculateItemTotalPerPerson(item);
            item.assignedPeople.forEach(person => {
                summary[person] += totalPerPerson;
            });
        });

        // Calculate grand total
        grandTotal = totalSubtotal + Object.values(taxTotals).reduce((a, b) => a + b, 0) + totalTip;

        // Render summary
        const container = document.getElementById('summaryContainer');
        const taxBreakdown = this.taxRates.map(tax => {
            const total = taxTotals[tax.id];
            return total > 0 ? `
                <div class="breakdown-row">
                    <span>${tax.name} (${this.formatCurrency(tax.rate)}%):</span>
                    <span>$${this.formatCurrency(total)}</span>
                </div>
            ` : '';
        }).join('');

        container.innerHTML = `
            <div class="bill-breakdown">
                <div class="breakdown-row">
                    <span>Subtotal:</span>
                    <span>$${this.formatCurrency(totalSubtotal)}</span>
                </div>
                ${taxBreakdown}
                <div class="breakdown-row">
                    <span>Tip (${this.formatCurrency(this.tipRate)}%):</span>
                    <span>$${this.formatCurrency(totalTip)}</span>
                </div>
                <div class="breakdown-row total-row">
                    <span><strong>Total Bill:</strong></span>
                    <span><strong>$${this.formatCurrency(grandTotal)}</strong></span>
                </div>
            </div>

            <div class="person-breakdown">
                <h4>Per Person Breakdown:</h4>
                ${Object.entries(summary).map(([person, amount]) => `
                    <div class="person-summary">
                        <span>${person}</span>
                        <span>$${this.formatCurrency(amount)}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

// Initialize the app
const billSplitter = new BillSplitter();