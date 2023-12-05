package prql

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"fmt"

	"github.com/grafana/grafana-plugin-sdk-go/data"
	"github.com/grafana/grafana-plugin-sdk-go/data/sqlutil"
	duckdb "github.com/marcboeker/go-duckdb"
)

type DuckDB struct {
	DB   *sql.DB
	Name string
}

func (d *DuckDB) Query(q string) (data.Frames, error) {
	db, err := sql.Open("duckdb", d.Name)
	if err != nil {
		return nil, err
	}
	d.DB = db
	defer func(db *sql.DB) {
		err = db.Close()
		fmt.Println("failed to close db")
	}(db)

	results, err := d.DB.Query(q)
	if err != nil {
		fmt.Println(err)
		return nil, err
	}

	frame, err := sqlutil.FrameFromRows(results, -1, sqlutil.Converter{})
	return data.Frames{frame}, err
}

func (d *DuckDB) AppendAll(ctx context.Context, frames data.Frames) error {
	db, err := sql.Open("duckdb", d.Name)
	if err != nil {
		return err
	}
	d.DB = db
	defer func(db *sql.DB) {
		err = db.Close()
		fmt.Println("failed to close db")
	}(db)
	d.createTables(frames)
	connector, err := duckdb.NewConnector(d.Name, nil)
	if err != nil {
		return err
	}
	conn, err := connector.Connect(context.Background())
	if err != nil {
		return err
	}
	defer conn.Close()

	for _, f := range frames {
		name := f.RefID
		if name == "" {
			name = f.Name
		}
		appender, err := duckdb.NewAppenderFromConn(conn, "", name)
		if err != nil {
			return err
		}
		for i := 0; i < f.Rows(); i++ {
			var row []driver.Value
			for _, ff := range f.Fields {
				val := ff.At(i)
				row = append(row, val)
			}
			err := appender.AppendRow(row...)
			if err != nil {
				fmt.Println(err)
				return err
			}
		}

	}
	return nil
}

func (d *DuckDB) createTables(frames data.Frames) error {
	for _, f := range frames {
		name := f.RefID
		if name == "" {
			name = f.Name
		}
		fmt.Println("creating table " + name)
		createTable := "create or replace table " + name + " ("
		sep := ""
		for _, fld := range f.Fields {
			createTable += sep
			createTable += fld.Name
			if fld.Type() == data.FieldTypeBool || fld.Type() == data.FieldTypeNullableBool {
				createTable += " " + "BOOLEAN"
			}
			if fld.Type() == data.FieldTypeFloat32 || fld.Type() == data.FieldTypeFloat64 || fld.Type() == data.FieldTypeNullableFloat32 || fld.Type() == data.FieldTypeNullableFloat64 {
				createTable += " " + "DOUBLE"
			}
			if fld.Type() == data.FieldTypeInt8 || fld.Type() == data.FieldTypeInt16 || fld.Type() == data.FieldTypeInt32 || fld.Type() == data.FieldTypeNullableInt8 || fld.Type() == data.FieldTypeNullableInt16 || fld.Type() == data.FieldTypeNullableInt32 {
				createTable += " " + "INTEGER"
			}
			if fld.Type() == data.FieldTypeInt64 || fld.Type() == data.FieldTypeNullableInt64 {
				createTable += " " + "BIGINT"
			}
			if fld.Type() == data.FieldTypeUint8 || fld.Type() == data.FieldTypeUint16 || fld.Type() == data.FieldTypeUint32 || fld.Type() == data.FieldTypeNullableUint8 || fld.Type() == data.FieldTypeNullableUint16 || fld.Type() == data.FieldTypeNullableUint32 {
				createTable += " " + "UINTEGER"
			}
			if fld.Type() == data.FieldTypeUint64 || fld.Type() == data.FieldTypeNullableUint64 {
				createTable += " " + "UBIGINT"
			}
			if fld.Type() == data.FieldTypeString || fld.Type() == data.FieldTypeNullableString {
				createTable += " " + "VARCHAR"
			}
			if fld.Type() == data.FieldTypeTime || fld.Type() == data.FieldTypeNullableTime {
				createTable += " " + "TIMESTAMP"
			}
			if fld.Type() == data.FieldTypeUnknown {
				createTable += " " + "BLOB"
			}
			sep = " ,"
		}
		createTable += ")"
		fmt.Println(createTable)

		_, err := d.DB.Query(createTable)
		if err != nil {
			fmt.Println(err)
			return err
		}
	}
	return nil
}