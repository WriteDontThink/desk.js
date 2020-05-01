import Delta from 'quill-delta';

interface DeskSnapshot {
    pages: { [pageNum: number]: Delta }
}

export default DeskSnapshot;