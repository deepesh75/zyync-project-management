import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { id } = req.query
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid task ID' })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  if (req.method === 'GET') {
    const attachments = await prisma.attachment.findMany({
      where: { taskId: id },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return res.status(200).json(attachments)
  }

  if (req.method === 'POST') {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    
    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB limit per file
      maxTotalFileSize: 50 * 1024 * 1024, // 50MB total limit
      maxFiles: 1,
      filename: (name, ext, part) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`
        return `${uniqueSuffix}${ext}`
      }
    })

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('File upload error:', err)
        if (err.code === 1009) {
          return res.status(413).json({ error: 'File too large. Maximum size is 50MB.' })
        }
        return res.status(500).json({ error: 'File upload failed: ' + err.message })
      }

      const file = Array.isArray(files.file) ? files.file[0] : files.file
      
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' })
      }

      try {
        const attachment = await prisma.attachment.create({
          data: {
            filename: file.newFilename || file.originalFilename || 'unknown',
            originalName: file.originalFilename || 'unknown',
            mimeType: file.mimetype || 'application/octet-stream',
            size: file.size,
            url: `/uploads/${file.newFilename}`,
            taskId: id,
            uploadedById: user.id
          },
          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        })

        return res.status(201).json(attachment)
      } catch (error) {
        console.error('Database error:', error)
        // Clean up uploaded file if database insert fails
        if (file.filepath) {
          try {
            fs.unlinkSync(file.filepath)
          } catch (unlinkError) {
            console.error('Failed to delete file:', unlinkError)
          }
        }
        return res.status(500).json({ error: 'Failed to save attachment' })
      }
    })
    
    // Prevent the function from returning before form.parse completes
    return
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
