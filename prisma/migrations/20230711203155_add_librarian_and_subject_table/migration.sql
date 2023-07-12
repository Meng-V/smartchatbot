-- CreateTable
CREATE TABLE "Subject" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "librarianID" INTEGER NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Librarian" (
    "id" INTEGER NOT NULL,
    "uuid" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Librarian_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Librarian_email_key" ON "Librarian"("email");

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_librarianID_fkey" FOREIGN KEY ("librarianID") REFERENCES "Librarian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
