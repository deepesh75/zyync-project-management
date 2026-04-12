import { prisma } from './prisma'

export interface InvoiceData {
  organizationId: string
  paymentId: string
  amount: number // in paise
  currency: string
  planName: string
  billingPeriodStart: Date
  billingPeriodEnd: Date
  subtotal?: number
  taxAmount?: number
  taxPercentage?: number
  notes?: string
}

/**
 * Generate a unique invoice number
 * Format: INV-YYYY-NNNNN
 */
export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear()
  
  // Get the last invoice number for this year
  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: `INV-${year}-`
      }
    },
    orderBy: {
      invoiceNumber: 'desc'
    }
  })
  
  let nextNumber = 1
  if (lastInvoice) {
    const matches = lastInvoice.invoiceNumber.match(/INV-\d+-(\d+)/)
    if (matches) {
      nextNumber = parseInt(matches[1]) + 1
    }
  }
  
  return `INV-${year}-${String(nextNumber).padStart(5, '0')}`
}

/**
 * Create an invoice for a payment
 */
export async function createInvoice(data: InvoiceData): Promise<{ id: string; invoiceNumber: string }> {
  try {
    const invoiceNumber = await generateInvoiceNumber()
    
    // Calculate totals if not provided
    const subtotal = data.subtotal || data.amount
    const taxAmount = data.taxAmount || 0
    const totalAmount = subtotal + taxAmount
    
    // Verify total matches payment amount
    if (totalAmount !== data.amount) {
      console.warn(
        `Invoice amount mismatch: subtotal (${subtotal}) + tax (${taxAmount}) = ${totalAmount}, but payment is ${data.amount}`
      )
    }
    
    const invoice = await prisma.invoice.create({
      data: {
        organizationId: data.organizationId,
        paymentId: data.paymentId,
        invoiceNumber,
        amount: data.amount,
        currency: data.currency,
        planName: data.planName,
        billingPeriodStart: data.billingPeriodStart,
        billingPeriodEnd: data.billingPeriodEnd,
        subtotal: data.subtotal,
        taxAmount: data.taxAmount,
        taxPercentage: data.taxPercentage,
        notes: data.notes,
        status: 'issued',
        issuedAt: new Date(),
        dueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      }
    })
    
    console.log(`Invoice created: ${invoice.invoiceNumber} for organization ${data.organizationId}`)
    
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber
    }
  } catch (error) {
    console.error('Error creating invoice:', error)
    throw error
  }
}

/**
 * Mark invoice as paid
 */
export async function markInvoiceAsPaid(invoiceId: string): Promise<void> {
  try {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'paid',
        paidAt: new Date()
      }
    })
    console.log(`Invoice marked as paid: ${invoiceId}`)
  } catch (error) {
    console.error('Error marking invoice as paid:', error)
    throw error
  }
}

/**
 * Mark invoice as overdue
 */
export async function markInvoiceAsOverdue(invoiceId: string): Promise<void> {
  try {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'overdue' }
    })
    console.log(`Invoice marked as overdue: ${invoiceId}`)
  } catch (error) {
    console.error('Error marking invoice as overdue:', error)
    throw error
  }
}

/**
 * Get invoices for an organization
 */
export async function getOrganizationInvoices(
  organizationId: string,
  filters?: { status?: string; fromDate?: Date; toDate?: Date }
): Promise<any[]> {
  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        organizationId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.fromDate && { issuedAt: { gte: filters.fromDate } }),
        ...(filters?.toDate && { issuedAt: { lte: filters.toDate } })
      },
      orderBy: { issuedAt: 'desc' },
      include: { payment: true }
    })
    
    return invoices
  } catch (error) {
    console.error('Error fetching invoices:', error)
    throw error
  }
}

/**
 * Calculate invoice totals and verification
 */
export function calculateInvoiceTotals(data: Omit<InvoiceData, 'organizationId' | 'paymentId'>) {
  const subtotal = data.subtotal || data.amount
  const taxAmount = data.taxAmount || 0
  const total = subtotal + taxAmount
  
  return {
    subtotal,
    taxAmount,
    total,
    isValid: total === data.amount
  }
}
