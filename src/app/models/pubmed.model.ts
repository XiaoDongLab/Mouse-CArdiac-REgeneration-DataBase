export class Pubmed {
    title: string;
    first_author: string;
    all_authors: string[];
    publish_year: string | number;
    constructor(title: string, all_authors: string[], publish_year: string | number) {
        this.title = title;
        this.all_authors = all_authors;
        this.first_author = all_authors[0];
        this.publish_year = publish_year;
    }
}
