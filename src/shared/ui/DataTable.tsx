import { SearchOutlined } from '@ant-design/icons'
import { Card, Empty, Flex, Input, Table } from 'antd'
import type { TableProps } from 'antd'
import type { ColumnType, SorterResult } from 'antd/es/table/interface'
import { useEffect, useState, type ReactNode } from 'react'

import { isPaginated, type ListResponse } from '@/shared/api/list'
import { useUrlState } from '@/shared/lib/useUrlState'

import { QueryError } from './QueryError'

const DEFAULT_PAGE_SIZE = 20

export interface DataTableColumn<T> extends ColumnType<T> {
  /**
   * `true` bo'lsa ustun backend orqali saralanadi (`?ordering=field` / `-field`).
   * Maydon nomi `key` yoki `dataIndex` dan olinadi. Backendda OrderingFilter'da bo'lishi kerak.
   */
  sortable?: boolean
}

interface DataTableProps<T> extends Omit<
  TableProps<T>,
  'dataSource' | 'pagination' | 'loading' | 'onChange' | 'columns'
> {
  columns: DataTableColumn<T>[]
  data: ListResponse<T> | undefined
  loading?: boolean
  error?: unknown
  onRetry?: () => void
  /** Qidiruv maydoni (`?search=`). `false` — ko'rsatilmaydi */
  searchPlaceholder?: string | false
  /** Qidiruv yonidagi filtrlar */
  filters?: ReactNode
  emptyText?: string
}

/**
 * Ro'yxat sahifalari uchun yagona jadval:
 *  - qidiruv, saralash, sahifa URL'da saqlanadi (useUrlState)
 *  - backend massiv qaytarsa — sahifalash frontendda, `{count, results}` qaytarsa — serverda
 *  - loading / bo'sh / xato holatlari
 *
 * API parametrlarini olish uchun `useTableParams` dan foydalaning.
 */
export function DataTable<T extends object>({
  columns,
  data,
  loading,
  error,
  onRetry,
  searchPlaceholder = 'Qidirish...',
  filters,
  emptyText = "Ma'lumot yo'q",
  rowKey = 'id' as TableProps<T>['rowKey'],
  ...rest
}: DataTableProps<T>) {
  const [url, setUrl] = useUrlState()
  const page = Number(url.get('page')) || 1
  const pageSize = Number(url.get('page_size')) || DEFAULT_PAGE_SIZE
  const ordering = url.get('ordering') ?? ''

  const urlSearch = url.get('search') ?? ''
  const [search, setSearch] = useState(urlSearch)
  const [syncedSearch, setSyncedSearch] = useState(urlSearch)

  // Tashqaridan (masalan, "orqaga" tugmasi) URL o'zgarsa inputni render paytida sinxronlaymiz
  if (urlSearch !== syncedSearch) {
    setSyncedSearch(urlSearch)
    setSearch(urlSearch)
  }

  // Har bir harfda so'rov yubormaslik uchun 400 ms kutamiz
  useEffect(() => {
    if (search === urlSearch) return
    const timer = setTimeout(() => setUrl({ search: search.trim() }), 400)
    return () => clearTimeout(timer)
  }, [search, urlSearch, setUrl])

  if (error) return <QueryError error={error} onRetry={onRetry} />

  const paginated = isPaginated(data)
  const rows = paginated ? data.results : (data ?? [])
  const total = paginated ? data.count : rows.length

  const fieldOf = (col: DataTableColumn<T>) =>
    String(col.key ?? (Array.isArray(col.dataIndex) ? col.dataIndex.join('__') : col.dataIndex))

  const tableColumns: ColumnType<T>[] = columns.map(({ sortable, ...col }) => {
    if (!sortable) return col
    const field = fieldOf({ ...col, sortable })
    return {
      ...col,
      key: field,
      sorter: true,
      sortOrder: ordering === field ? 'ascend' : ordering === `-${field}` ? 'descend' : null,
    }
  })

  const onChange: TableProps<T>['onChange'] = (pagination, _filters, sorter, extra) => {
    if (extra.action === 'sort') {
      const s = (Array.isArray(sorter) ? sorter[0] : sorter) as SorterResult<T>
      const field = s.columnKey ? String(s.columnKey) : ''
      setUrl({ ordering: s.order && field ? `${s.order === 'descend' ? '-' : ''}${field}` : null })
    } else if (extra.action === 'paginate') {
      setUrl(
        {
          page: pagination.current === 1 ? null : pagination.current,
          page_size: pagination.pageSize === DEFAULT_PAGE_SIZE ? null : pagination.pageSize,
        },
        { resetPage: false },
      )
    }
  }

  const showToolbar = searchPlaceholder !== false || filters

  return (
    <Card styles={{ body: { padding: 0 } }}>
      {showToolbar && (
        <Flex gap={8} wrap style={{ padding: 16 }}>
          {searchPlaceholder !== false && (
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 280, maxWidth: '100%' }}
            />
          )}
          {filters}
        </Flex>
      )}
      <Table<T>
        {...rest}
        rowKey={rowKey}
        columns={tableColumns}
        dataSource={rows}
        loading={loading}
        onChange={onChange}
        scroll={{ x: 'max-content', ...rest.scroll }}
        locale={{ emptyText: <Empty description={emptyText} /> }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
          showTotal: (count) => `Jami: ${count}`,
          hideOnSinglePage: total <= 10,
        }}
      />
    </Card>
  )
}
