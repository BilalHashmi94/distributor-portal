const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const Report = require('../models/Report');
const { protect, adminOnly } = require('../middleware/auth');
const { sendReportUploadNotification } = require('../utils/email');

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.xlsx', '.xls', '.csv'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Only Excel files (.xlsx, .xls, .csv) are allowed'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// Parse Excel/CSV file to JSON
const parseFile = (filePath) => {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  if (!jsonData || jsonData.length === 0) return { headers: [], data: [] };

  const headers = jsonData[0].map(h => String(h || '').trim());
  const data = jsonData.slice(1).map((row, rowIndex) => {
    const obj = { _rowId: rowIndex };
    headers.forEach((header, i) => {
      obj[header] = row[i] !== undefined ? row[i] : '';
    });
    return obj;
  }).filter(row => Object.keys(row).some(k => k !== '_rowId' && row[k] !== ''));

  return { headers, data };
};

// POST /api/reports/upload - Distributor: upload report
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const { title, month, year } = req.body;
    if (!title || !month || !year) {
      return res.status(400).json({ message: 'Title, month, and year are required' });
    }

    const { headers, data } = parseFile(req.file.path);

    if (headers.length === 0) {
      return res.status(400).json({ message: 'File is empty or has no valid data' });
    }

    const report = await Report.create({
      distributor: req.user._id,
      title,
      month: parseInt(month),
      year: parseInt(year),
      originalFileName: req.file.originalname,
      filePath: req.file.path,
      headers,
      data,
      rowCount: data.length
    });

    await report.populate('distributor', 'name email company');

    // Notify admin
    try {
      await sendReportUploadNotification({
        distributorName: req.user.name,
        distributorEmail: req.user.email,
        reportTitle: title,
        month: parseInt(month),
        year: parseInt(year)
      });
    } catch (emailError) {
      console.error('Admin notification email failed:', emailError.message);
    }

    res.status(201).json({ report, message: 'Report uploaded successfully' });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// GET /api/reports - Get reports (admin: all, distributor: own)
router.get('/', protect, async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { distributor: req.user._id };
    const reports = await Report.find(query)
      .populate('distributor', 'name email company')
      .sort({ createdAt: -1 })
      .select('-data -headers'); // Exclude large data for list view
    res.json({ reports });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/reports/:id - Get single report with full data
router.get('/:id', protect, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'admin') query.distributor = req.user._id;

    const report = await Report.findOne(query).populate('distributor', 'name email company');
    if (!report) return res.status(404).json({ message: 'Report not found' });

    res.json({ report });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/reports/:id - Update report data (edit table)
router.put('/:id', protect, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'admin') query.distributor = req.user._id;

    const { data, headers, notes, status } = req.body;
    const updateData = {};
    if (data) { updateData.data = data; updateData.rowCount = data.length; }
    if (headers) updateData.headers = headers;
    if (notes !== undefined) updateData.notes = notes;
    if (status && req.user.role === 'admin') updateData.status = status;

    const report = await Report.findOneAndUpdate(query, updateData, { new: true })
      .populate('distributor', 'name email company');

    if (!report) return res.status(404).json({ message: 'Report not found' });

    res.json({ report, message: 'Report updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/reports/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'admin') query.distributor = req.user._id;

    const report = await Report.findOneAndDelete(query);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    // Delete file
    if (fs.existsSync(report.filePath)) fs.unlinkSync(report.filePath);

    res.json({ message: 'Report deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/reports/:id/export - Export report as Excel
router.get('/:id/export', protect, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'admin') query.distributor = req.user._id;

    const report = await Report.findOne(query).populate('distributor', 'name email company');
    if (!report) return res.status(404).json({ message: 'Report not found' });

    const workbook = XLSX.utils.book_new();
    const wsData = [report.headers, ...report.data.map(row =>
      report.headers.map(h => row[h] !== undefined ? row[h] : '')
    )];
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);

    // Auto column widths
    const colWidths = report.headers.map(h => ({ wch: Math.max(h.length, 12) }));
    worksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const fileName = `${report.title.replace(/[^a-zA-Z0-9]/g, '_')}_${monthNames[report.month-1]}_${report.year}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
