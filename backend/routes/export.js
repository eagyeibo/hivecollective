const express = require('express');
const PDFDocument = require('pdfkit');
const pool = require('../db');

const router = express.Router();

// ─────────────────────────────────────────
// GET /api/export/problems/:id
// Public — generates and streams a PDF report for a problem
// ─────────────────────────────────────────
router.get('/problems/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Fetch the problem
    const problemResult = await pool.query(
      `SELECT
        p.id, p.title, p.description, p.scope, p.location_tag, p.created_at,
        u.username AS posted_by
       FROM problems p
       JOIN users u ON u.id = p.user_id
       WHERE p.id = $1`,
      [id]
    );

    if (problemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found.' });
    }

    const problem = problemResult.rows[0];

    // Fetch solutions sorted by score
    const solutionsResult = await pool.query(
      `SELECT
        s.id, s.content, s.score, s.is_implemented, s.created_at,
        u.username AS posted_by
       FROM solutions s
       JOIN users u ON u.id = s.user_id
       WHERE s.problem_id = $1 AND s.is_removed = FALSE
       ORDER BY s.score DESC, s.created_at ASC`,
      [id]
    );

    const solutions = solutionsResult.rows;

    // Fetch credits for implemented solutions
    const creditsResult = await pool.query(
      `SELECT
        sc.solution_id,
        u.username
       FROM solution_credits sc
       JOIN users u ON u.id = sc.user_id
       WHERE sc.solution_id = ANY(
         SELECT id FROM solutions WHERE problem_id = $1
       )`,
      [id]
    );

    // Group credits by solution_id
    const creditsBySolution = {};
    creditsResult.rows.forEach(row => {
      if (!creditsBySolution[row.solution_id]) {
        creditsBySolution[row.solution_id] = [];
      }
      creditsBySolution[row.solution_id].push(row.username);
    });

    // ─── Build the PDF ───────────────────
    const doc = new PDFDocument({ margin: 60, size: 'A4' });

    // Set response headers so browser downloads it as a file
    const safeTitle = problem.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="hivecollective_${safeTitle}.pdf"`);
    doc.pipe(res);

    // ── Header ──
    doc
      .fontSize(10)
      .fillColor('#888888')
      .text('HiveCollective — Community Problem Solving Report', { align: 'left' })
      .text(new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }), { align: 'right' })
      .moveDown(0.5);

    // Horizontal rule
    doc
      .moveTo(60, doc.y)
      .lineTo(535, doc.y)
      .strokeColor('#e5e5e5')
      .stroke()
      .moveDown(1);

    // ── Problem title ──
    doc
      .fontSize(20)
      .fillColor('#111111')
      .font('Helvetica-Bold')
      .text(problem.title, { align: 'left' })
      .moveDown(0.5);

    // ── Meta tags ──
    doc
      .fontSize(10)
      .fillColor('#555555')
      .font('Helvetica')
      .text(`Scope: ${problem.scope.charAt(0).toUpperCase() + problem.scope.slice(1)}   |   Location: ${problem.location_tag}   |   Posted by: ${problem.posted_by}   |   Date: ${new Date(problem.created_at).toLocaleDateString()}`)
      .moveDown(1);

    // ── Problem description ──
    doc
      .fontSize(11)
      .fillColor('#333333')
      .font('Helvetica')
      .text(problem.description, { align: 'justify', lineGap: 4 })
      .moveDown(1.5);

    // Horizontal rule
    doc
      .moveTo(60, doc.y)
      .lineTo(535, doc.y)
      .strokeColor('#e5e5e5')
      .stroke()
      .moveDown(1);

    // ── Solutions heading ──
    doc
      .fontSize(14)
      .fillColor('#111111')
      .font('Helvetica-Bold')
      .text(`Proposed Solutions (${solutions.length})`)
      .moveDown(1);

    if (solutions.length === 0) {
      doc
        .fontSize(11)
        .fillColor('#888888')
        .font('Helvetica')
        .text('No solutions have been proposed yet.')
        .moveDown(1);
    }

    // ── Each solution ──
    solutions.forEach((solution, index) => {
      // Check if we need a new page
      if (doc.y > 700) doc.addPage();

      // Solution number + implemented badge
      const label = `Solution ${index + 1}${solution.is_implemented ? '  ✓ Implemented' : ''}`;
doc
  .fontSize(11)
  .fillColor(solution.is_implemented ? '#15803d' : '#1d4ed8')
  .font('Helvetica-Bold')
  .text(label)
  .moveDown(0.3);

// Solution content — strip any leading "Solution X:" prefix if present
const cleanContent = solution.content.replace(/^solution\s*\d+\s*:\s*/i, '').trim();
doc
  .fontSize(11)
  .fillColor('#333333')
  .font('Helvetica')
  .text(cleanContent, { align: 'justify', lineGap: 4 })
  .moveDown(0.5);

      // Solution meta
      doc
        .fontSize(9)
        .fillColor('#888888')
        .text(`Proposed by: ${solution.posted_by}   |   Score: ${solution.score}   |   Date: ${new Date(solution.created_at).toLocaleDateString()}`);

      // Credits if implemented
      if (solution.is_implemented && creditsBySolution[solution.id]) {
        doc
          .moveDown(0.3)
          .fontSize(9)
          .fillColor('#15803d')
          .text(`Contributors: ${creditsBySolution[solution.id].join(', ')}`);
      }

      // Divider between solutions
      doc
        .moveDown(0.8)
        .moveTo(60, doc.y)
        .lineTo(535, doc.y)
        .strokeColor('#f0f0f0')
        .stroke()
        .moveDown(0.8);
    });

    // ── Footer ──
    doc
      .moveDown(1)
      .fontSize(9)
      .fillColor('#aaaaaa')
      .text('Generated by HiveCollective — hivecollective.org', { align: 'center' })
      .text('Collective minds. Real solutions.', { align: 'center' });

    doc.end();

  } catch (err) {
    console.error('PDF export error:', err);
    return res.status(500).json({ error: 'Could not generate PDF.' });
  }
});

module.exports = router;
