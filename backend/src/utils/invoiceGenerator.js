import PDFDocument from 'pdfkit';

/**
 * @desc    Generate a professional PDF invoice
 * @param   {Object} order - The order document from MongoDB
 * @param   {Object} res - Express response object
 */
export const generateInvoicePDF = (order, res) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Fix: correct method is setHeader
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=Invoice-${order._id}.pdf`);

    doc.pipe(res);

    // --- Header Section ---
    doc.fillColor('#444444')
        .fontSize(25)
        .text('RestoSync', 50, 50) // Brand Name
        .fontSize(10)
        .text('RestoSync Solutions Inc.', 200, 50, { align: 'right' })
        .text('123 Culinary Road, Food City', 200, 65, { align: 'right' })
        .text('support@restosync.com', 200, 80, { align: 'right' })
        .moveDown();

    // --- Horizontal Line ---
    doc.strokeColor('#aaaaaa')
        .lineWidth(1)
        .moveTo(50, 100)
        .lineTo(550, 100)
        .stroke();

    // --- Order Metadata ---
    doc.fillColor('#000000')
        .fontSize(12)
        .text(`Invoice ID: #${order._id.toString().toUpperCase()}`, 50, 120)
        .text(`Order Date: ${new Date(order.createdAt).toLocaleString()}`, 50, 135)
        .text(`Customer: ${order.customerName || 'Guest'}`, 50, 150)
        .text(`Table: ${order.tableId ? order.tableId : 'N/A'}`, 50, 165, { align: 'right' })
        .moveDown();

    // --- Table Header ---
    const tableTop = 200;
    doc.font('Helvetica-Bold');
    generateTableRow(doc, tableTop, 'Item', 'Qty', 'Unit Price', 'Total');
    doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    doc.font('Helvetica');

    // --- Table Items ---
    let i = 0;
    order.items.forEach((item, index) => {
        const y = tableTop + 30 + (index * 25);
        const itemName = item.menuItemId?.name || 'Menu Item';
        const itemTotal = (item.quantity * item.priceAtOrder).toFixed(2);

        generateTableRow(
            doc,
            y,
            itemName,
            item.quantity.toString(),
            `$${item.priceAtOrder.toFixed(2)}`,
            `$${itemTotal}`
        );
        i = index;
    });

    // --- Totals Section ---
    const subtotalPosition = tableTop + 30 + ((i + 1) * 25) + 20;
    doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(50, subtotalPosition).lineTo(550, subtotalPosition).stroke();

    doc.fontSize(14)
        .font('Helvetica-Bold')
        .text('Total Amount:', 350, subtotalPosition + 15)
        .text(`$${order.totalAmount.toFixed(2)}`, 450, subtotalPosition + 15, { align: 'right' });

    // --- Footer ---
    doc.fontSize(10)
        .font('Helvetica-Oblique')
        .fillColor('#777777')
        .text('Thank you for dining with us!', 50, 700, { align: 'center', width: 500 });

    // Finalize the PDF
    doc.end();
};

/**
 * Helper to generate a consistent table row
 */
function generateTableRow(doc, y, item, qty, price, total) {
    doc.fontSize(10)
        .text(item, 50, y)
        .text(qty, 280, y, { width: 40, align: 'right' })
        .text(price, 350, y, { width: 90, align: 'right' })
        .text(total, 480, y, { align: 'right' });
}
