import { Test, TestingModule } from '@nestjs/testing';
import {
  LibrarianInformation,
  LibrarianSubjectLookupToolService,
} from './librarian-subject-lookup-tool.service';
import { HttpModule } from '@nestjs/axios';
import { LibraryApiModule } from '../../../../library-api/library-api.module';
import AxiosResponse from 'axios';

describe('LibrarianSubjectLookupToolService', () => {
  let service: LibrarianSubjectLookupToolService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule, LibraryApiModule],
      providers: [LibrarianSubjectLookupToolService],
    }).compile();

    service = module.get<LibrarianSubjectLookupToolService>(
      LibrarianSubjectLookupToolService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should output correct librarian for input subject', async () => {
    const fakeLibrarianInformation: LibrarianInformation[] = [
      {
        id: 1,
        email: 'john@example.com',
        uuid: 'uuid1',
        first_name: 'John',
        last_name: 'Doe',
        title: 'Senior Librarian',
        subjects: [
          { id: 1, name: 'Physics', slug_id: 101 },
          { id: 2, name: 'Mathematics', slug_id: 102 },
        ],
      },
      {
        id: 2,
        email: 'jane@example.com',
        uuid: 'uuid2',
        first_name: 'Jane',
        last_name: 'Smith',
        title: 'Junior Librarian',
        subjects: [
          { id: 3, name: 'Chemistry', slug_id: 103 },
          { id: 4, name: 'Biology', slug_id: 104 },
        ],
      },
      {
        id: 3,
        email: 'rich@example.com',
        uuid: 'uuid3',
        first_name: 'Richard',
        last_name: 'Jackson',
        title: 'Part-time Librarian',
        subjects: [
          { id: 5, name: 'Computer Science', slug_id: 105 },
          { id: 6, name: 'Finance', slug_id: 106 },
        ],
      },
      {
        id: 4,
        email: 'joe@example.com',
        uuid: 'uuid4',
        first_name: 'Joe',
        last_name: 'Bane',
        title: 'Part-time Librarian',
        subjects: [
          { id: 7, name: 'Computer Tech', slug_id: 107 },
          { id: 6, name: 'Finance', slug_id: 106 },
        ],
      },
    ];

    jest
      .spyOn(service, 'fetchLibrarianSubjectData')
      .mockResolvedValue(fakeLibrarianInformation);

    let expectedAnswer = `These are the librarians that can help you with the requested subject: ${JSON.stringify(
      {
        'Computer Science': {
          librarians: [
            {
              name: 'Richard Jackson',
              email: 'rich@example.com',
            },
          ],
          subjectHomepage:
            'https://libguides.lib.miamioh.edu/sb.php?subject_id=5',
        },
      },
    )}`;

    expect(
      await service.toolRunForLlm({ subjectName: 'Computer Science' }),
    ).toEqual(expectedAnswer);
    //Test for typt
    expect(
      await service.toolRunForLlm({ subjectName: 'Computer Scince' }),
    ).toEqual(expectedAnswer);

    //Test for different subject
    expectedAnswer = `These are the librarians that can help you with the requested subject: ${JSON.stringify(
      {
        Chemistry: {
          librarians: [
            {
              name: 'Jane Smith',
              email: 'jane@example.com',
            },
          ],
          subjectHomepage:
            'https://libguides.lib.miamioh.edu/sb.php?subject_id=3',
        },
      },
    )}`;

    expect(await service.toolRunForLlm({ subjectName: 'Chemsty' })).toEqual(
      expectedAnswer,
    );
  });
});
