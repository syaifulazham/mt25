import { Document, Paragraph, Table, TableRow, TableCell, BorderStyle, WidthType, Packer, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { Contestant } from '@/types/contestant';

// Define a Contest type as it seems to be used but not defined in the Contestant type
interface Contest {
  id: number;
  name: string;
}

const borders = {
  top: {
    style: BorderStyle.SINGLE,
    size: 1,
    color: '000000',
  },
  bottom: {
    style: BorderStyle.SINGLE,
    size: 1,
    color: '000000',
  },
  left: {
    style: BorderStyle.SINGLE,
    size: 1,
    color: '000000',
  },
  right: {
    style: BorderStyle.SINGLE,
    size: 1,
    color: '000000',
  },
  insideHorizontal: {
    style: BorderStyle.SINGLE,
    size: 1,
    color: '000000',
  },
  insideVertical: {
    style: BorderStyle.SINGLE,
    size: 1,
    color: '000000',
  },
};

export function generateContestantsDocx(contestants: Contestant[], title: string = 'Contestants List') {
  // Create header row
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        shading: { fill: 'EEEEEE' },
        children: [new Paragraph('No.')],
        width: { size: 5, type: WidthType.PERCENTAGE },
      }),
      new TableCell({
        shading: { fill: 'EEEEEE' },
        children: [new Paragraph('Nama')],
        width: { size: 25, type: WidthType.PERCENTAGE },
      }),
      new TableCell({
        shading: { fill: 'EEEEEE' },
        children: [new Paragraph('KP')],
        width: { size: 20, type: WidthType.PERCENTAGE },
      }),
      new TableCell({
        shading: { fill: 'EEEEEE' },
        children: [new Paragraph('Jantina')],
        width: { size: 10, type: WidthType.PERCENTAGE },
      }),
      new TableCell({
        shading: { fill: 'EEEEEE' },
        children: [new Paragraph('Umur')],
        width: { size: 10, type: WidthType.PERCENTAGE },
      }),
      new TableCell({
        shading: { fill: 'EEEEEE' },
        children: [new Paragraph('Kelas')],
        width: { size: 30, type: WidthType.PERCENTAGE },
      }),
    ],
  });

  // Create data rows
  const rows = contestants.map((contestant, index) => {
    // Format gender text
    const gender = contestant.gender === 'M' ? 'Lelaki' : 
                  contestant.gender === 'F' ? 'Perempuan' : 
                  contestant.gender;
    
    // Format class display - combine class_grade and class_name
    const classDisplay = contestant.class_grade && contestant.class_name ? 
                        `${contestant.class_grade} - ${contestant.class_name}` : 
                        contestant.class_grade || contestant.class_name || '';

    return new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph((index + 1).toString())],
        }),
        new TableCell({
          children: [new Paragraph(contestant.name)],
        }),
        new TableCell({
          children: [new Paragraph(contestant.ic || '')],
        }),
        new TableCell({
          children: [new Paragraph(gender)],
        }),
        new TableCell({
          children: [new Paragraph(contestant.age?.toString() || '')],
        }),
        new TableCell({
          children: [new Paragraph(classDisplay)],
        }),
      ],
    });
  });

  // Create the table
  const table = new Table({
    rows: [headerRow, ...rows],
    borders: borders,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  // Create the document with title and table
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: title,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: `Generated on ${new Date().toLocaleDateString()}`,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: '' }),
          table,
        ],
      },
    ],
  });

  return doc;
}

export async function downloadContestantsAsDocx(contestants: Contestant[], filename: string = 'contestants') {
  const doc = generateContestantsDocx(contestants);
  
  // Generate the blob
  const blob = await Packer.toBlob(doc);
  
  // Save the file
  saveAs(blob, `${filename}.docx`);
}
