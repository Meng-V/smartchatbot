export type LibcalSubject = {
    id: number;
    name: string;
    slug_id: number;
}

export type LibrarianInformation = {
    id: number;
    email: string;
    uuid: string;
    login_fail_cnt: number;
    first_name: string;
    last_name: string;
    title: string;
    nickname: string;
    signature: string;
    created_by: number;
    created: string;
    updated: string;
    subjects: LibcalSubject[];
}